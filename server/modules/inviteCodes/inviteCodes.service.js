import GroupMember from '../../models/GroupMember.js';
import InviteCode from '../../models/InviteCode.js';
import StudentGroup from '../../models/StudentGroup.js';

const INVITE_WORDS = [
  'TIGER', 'EAGLE', 'MAPLE', 'RIVER', 'STORM', 'CLOUD', 'FLAME', 'CEDAR', 'PEARL', 'CORAL',
  'AMBER', 'FROST', 'LUNAR', 'SOLAR', 'PIXEL', 'WAVE', 'BLOOM', 'CREST', 'DUNE', 'EMBER',
  'FALCON', 'GROVE', 'HAVEN', 'IVORY', 'JADE', 'KELP', 'LANCE', 'MOSS', 'NOBLE', 'OCEAN',
  'PRISM', 'QUEST', 'RIDGE', 'SAGE', 'TIDAL', 'ULTRA', 'VAPOR', 'WILLOW', 'XENON', 'YONDER',
  'ZENITH', 'ARROW', 'BRIDGE', 'CHALK', 'DELTA', 'EPOCH', 'FORGE', 'GLADE', 'HARBOR', 'INLET',
  'JEWEL', 'KITE', 'LEMON', 'MANGO', 'NINJA', 'ONYX', 'PANDA', 'QUARTZ', 'ROBIN', 'STONE',
  'TOPAZ', 'UMBER', 'VIOLA', 'WALNUT', 'XYLO', 'YACHT', 'ZEBRA', 'ACORN', 'BIRCH', 'CRANE',
  'DAISY', 'ELDER', 'FINCH', 'GRAPE', 'HOLLY', 'INDIGO', 'JASPER', 'KNOLL', 'LILAC', 'MOCHA',
  'NECTAR', 'OLIVE', 'PLUME', 'QUILL', 'RAVEN', 'SWIFT', 'TERRA', 'UNITY', 'VENOM', 'WHEAT',
  'XYLEM', 'YARROW', 'ZEAL', 'ATLAS', 'BASIN', 'COMET', 'DRIFT', 'EXCEL', 'FABLE', 'GLINT',
  'HERON', 'ISLE', 'JOKER', 'KARMA', 'MIRTH', 'NOVA', 'OZONE', 'PLAIN', 'QUOTA', 'RADAR',
  'SPINE', 'TREND', 'URBAN', 'VIPER', 'WREN', 'OXIDE', 'YIELD', 'ZODIA', 'AURORA', 'BEACON',
  'CINDER', 'DAWN', 'ESTATE', 'FEATHER', 'GARDEN', 'HELIX', 'ICICLE', 'JUNGLE', 'KESTREL', 'LAGOON',
  'MEADOW', 'NIMBLE', 'ORBIT', 'PADDLE', 'QUARRY', 'ROCKET', 'SPRUCE', 'THISTLE', 'UPLIFT', 'VELVET',
  'WHISPER', 'XENIA', 'YELLOW', 'ZESTY', 'ALMOND', 'BLOSSOM', 'CANYON', 'DOLPHIN', 'ECHO', 'FERN',
  'GALAXY', 'HONEY', 'IRIS', 'JETTY', 'KINGFISHER', 'LOTUS', 'MARBLE', 'NECTARINE', 'OPAL', 'PINE',
  'QUASAR', 'REED', 'SILVER', 'TULIP', 'UMBRELLA', 'VALLEY', 'WATERFALL', 'YUCCA', 'ZINNIA', 'ANCHOR',
  'BREEZE', 'CIRCLE', 'DREAM', 'EMBLEM', 'FIELD', 'GLOW', 'HORIZON', 'ISLAND', 'JOURNEY', 'KNOT',
  'LEGEND', 'MOMENT', 'NEST', 'ORCHID', 'PLANET', 'ROSE', 'SPARK', 'TRAIL', 'UPWARD', 'VOYAGE',
  'WONDER', 'XYST', 'YOYO', 'ZEPHYR', 'ALPINE', 'BRONZE', 'COSMOS', 'DAYBREAK', 'EVEREST', 'FIREFLY',
];

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];
const MAX_CODE_GENERATION_ATTEMPTS = 5;

const buildUniqueCode = async (reservedCodes = new Set()) => {
  for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const code = generateCode();

    if (reservedCodes.has(code)) {
      continue;
    }

    const existingCode = await InviteCode.exists({ code });

    if (!existingCode) {
      return code;
    }
  }

  const error = new Error('Unable to generate a unique invite code. Please try again.');
  error.statusCode = 500;
  throw error;
};

const ensureGroupExists = async (groupId) => {
  const group = await StudentGroup.findById(groupId).select('_id name');

  if (!group) {
    const error = new Error('Student group not found.');
    error.statusCode = 404;
    throw error;
  }

  return group;
};

export const generateCode = () => {
  const word1 = pickRandom(INVITE_WORDS);
  let word2 = pickRandom(INVITE_WORDS);

  while (word2 === word1) {
    word2 = pickRandom(INVITE_WORDS);
  }

  const digits = String(Math.floor(Math.random() * 90) + 10);
  return `${word1}-${word2}-${digits}`;
};

export const generateSingleCode = async (groupId, adminId) => {
  await ensureGroupExists(groupId);
  const code = await buildUniqueCode();

  return InviteCode.create({
    code,
    groupId,
    createdBy: adminId,
  });
};

export const generateBulkCodes = async (groupId, adminId, count) => {
  await ensureGroupExists(groupId);

  if (!Number.isInteger(count) || count < 1 || count > 500) {
    const error = new Error('Count must be an integer between 1 and 500.');
    error.statusCode = 400;
    throw error;
  }

  const uniqueCodes = new Set();

  while (uniqueCodes.size < count) {
    const remaining = count - uniqueCodes.size;
    const generatedCodes = await Promise.all(
      Array.from({ length: remaining }, () => buildUniqueCode(uniqueCodes)),
    );

    generatedCodes.forEach((code) => {
      uniqueCodes.add(code);
    });
  }

  const buildDocuments = (codes) =>
    codes.map((code) => ({
      code,
      groupId,
      createdBy: adminId,
    }));

  try {
    return await InviteCode.insertMany(buildDocuments(Array.from(uniqueCodes)), { ordered: true });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const persistedCodes = new Set(
      (
        await InviteCode.find({ code: { $in: Array.from(uniqueCodes) } })
          .select('code')
          .lean()
      ).map((entry) => entry.code),
    );
    const retryCodes = new Set(Array.from(uniqueCodes).filter((code) => !persistedCodes.has(code)));

    while (retryCodes.size < count) {
      retryCodes.add(await buildUniqueCode(retryCodes));
    }

    return InviteCode.insertMany(buildDocuments(Array.from(retryCodes)), { ordered: true });
  }
};

export const validateCode = async (rawCode) => {
  const normalizedCode = String(rawCode || '').trim().toUpperCase();
  const inviteCode = await InviteCode.findOne({
    code: normalizedCode,
    isUsed: false,
  }).populate('groupId', 'name');

  if (!inviteCode) {
    return {
      valid: false,
      message: 'Invalid or already used code',
    };
  }

  if (inviteCode.expiresAt && inviteCode.expiresAt.getTime() < Date.now()) {
    return {
      valid: false,
      message: 'Invite code has expired',
    };
  }

  return {
    valid: true,
    groupId: inviteCode.groupId?._id || inviteCode.groupId,
    groupName: inviteCode.groupId?.name || '',
  };
};

export const validateAndConsumeCode = async (rawCode, studentUserId) => {
  const normalizedCode = String(rawCode || '').trim().toUpperCase();
  const now = new Date();
  const expiredCode = await InviteCode.exists({
    code: normalizedCode,
    expiresAt: { $ne: null, $lte: now },
  });

  if (expiredCode) {
    const error = new Error('Invite code has expired');
    error.statusCode = 400;
    throw error;
  }

  const inviteCode = await InviteCode.findOneAndUpdate(
    {
      code: normalizedCode,
      isUsed: false,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    },
    {
      $set: {
        isUsed: true,
        usedBy: studentUserId,
        usedAt: now,
      },
    },
    {
      new: true,
    },
  ).populate('groupId', 'name');

  if (!inviteCode) {
    const error = new Error('Invalid or already used invite code');
    error.statusCode = 400;
    throw error;
  }

  return {
    groupId: inviteCode.groupId?._id || inviteCode.groupId,
    groupName: inviteCode.groupId?.name || '',
  };
};

export const getCodesByGroup = async (groupId, adminId) => {
  await ensureGroupExists(groupId);

  return InviteCode.find({ groupId })
    .populate('usedBy', 'name email')
    .sort({ isUsed: 1, createdAt: -1 })
    .select('code isUsed usedBy usedAt createdAt expiresAt groupId createdBy');
};

export const deleteCode = async (codeId, adminId) => {
  const inviteCode = await InviteCode.findById(codeId);

  if (!inviteCode) {
    const error = new Error('Invite code not found.');
    error.statusCode = 404;
    throw error;
  }

  if (inviteCode.isUsed) {
    const error = new Error('Cannot delete a used invite code');
    error.statusCode = 400;
    throw error;
  }

  await InviteCode.findByIdAndDelete(codeId);

  return {
    success: true,
    message: 'Invite code deleted successfully.',
  };
};
