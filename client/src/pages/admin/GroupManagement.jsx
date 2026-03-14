import { Key, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import InviteCodesPanel from '../../components/admin/InviteCodesPanel';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import * as groupService from '../../services/groupService';
import { getUsers } from '../../services/userService';

const iconTones = ['bg-accent', 'bg-secondary', 'bg-tertiary', 'bg-quaternary'];
const defaultGroupForm = { name: '', description: '' };

const GroupManagement = () => {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInviteCodesOpen, setIsInviteCodesOpen] = useState(false);
  const [formData, setFormData] = useState(defaultGroupForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [groupData, studentData] = await Promise.all([groupService.getGroups(), getUsers({ role: 'student' })]);
      setGroups(groupData);
      setStudents(studentData);
    } catch (error) {
        setErrorMessage(error.message || 'Unable to load groups.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setSelectedGroup(null);
    setFormData(defaultGroupForm);
    setIsFormOpen(true);
  };

  const openEditModal = (group) => {
    setSelectedGroup(group);
    setFormData({ name: group.name, description: group.description || '' });
    setIsFormOpen(true);
  };

  const openDeleteModal = (group) => {
    setSelectedGroup(group);
    setIsDeleteOpen(true);
  };

  const openDetailModal = (group) => {
    setSelectedGroup(group);
    setSearchTerm('');
    setIsDetailOpen(true);
  };

  const openInviteCodesModal = (group) => {
    setSelectedGroup(group);
    setIsInviteCodesOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const refreshSelectedGroup = async (groupId) => {
    const refreshedGroup = await groupService.getGroupById(groupId);
    setSelectedGroup(refreshedGroup);
    setGroups((current) => current.map((group) => (group._id === groupId ? refreshedGroup : group)));
  };

  const handleSaveGroup = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (selectedGroup) {
        const updatedGroup = await groupService.updateGroup(selectedGroup._id, formData);
        const hydratedGroup = await groupService.getGroupById(updatedGroup._id);
        setGroups((current) => current.map((group) => (group._id === hydratedGroup._id ? hydratedGroup : group)));
      } else {
        const createdGroup = await groupService.createGroup(formData);
        const hydratedGroup = await groupService.getGroupById(createdGroup._id);
        setGroups((current) => [hydratedGroup, ...current]);
      }

      setIsFormOpen(false);
      setSelectedGroup(null);
      setFormData(defaultGroupForm);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await groupService.deleteGroup(selectedGroup._id);
      setGroups((current) => current.filter((group) => group._id !== selectedGroup._id));
      setIsDeleteOpen(false);
      setSelectedGroup(null);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (studentId) => {
    if (!selectedGroup) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await groupService.addMember(selectedGroup._id, studentId);
      await refreshSelectedGroup(selectedGroup._id);
      setSearchTerm('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to add member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (studentId) => {
    if (!selectedGroup) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await groupService.removeMember(selectedGroup._id, studentId);
      await refreshSelectedGroup(selectedGroup._id);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to remove member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const memberIds = new Set((selectedGroup?.members || []).map((member) => member.studentId?._id));

    return students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && !memberIds.has(student._id);
    });
  }, [searchTerm, selectedGroup?.members, students]);

  return (
    <DashboardLayout title="Group Management">
      <section className="editorial-page-header">
        <div>
          <div className="editorial-section-label">
            <span>Groups</span>
          </div>
          <h2 className="editorial-page-title">Student Groups</h2>
          <p className="editorial-page-copy">Build cohorts, review members, and manage invite-code targeting.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="editorial-button-primary"
        >
          <Plus size={18} />
          Create Group
        </button>
      </section>

      {errorMessage ? (
        <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8">
        {isLoading ? <LoadingSpinner /> : null}
        {!isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group, index) => (
              <div
                key={group._id}
                role="button"
                tabIndex={0}
                onClick={() => openDetailModal(group)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDetailModal(group);
                  }
                }}
                className="group relative rounded-2xl border border-border bg-card p-6 text-left shadow-editorialMd transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-editorialLg"
              >
                <div className={`absolute -top-5 left-6 flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground ${iconTones[index % iconTones.length]} shadow-pop-press`}>
                  <Users size={22} className="text-foreground" />
                </div>
                <div className="ml-auto flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditModal(group);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-secondary text-foreground shadow-pop-press"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDeleteModal(group);
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-accent text-accentFg shadow-pop-press"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="mt-10 font-heading text-2xl font-extrabold text-foreground">{group.name}</h3>
                <p className="mt-3 min-h-[3.5rem] text-sm leading-6 text-mutedFg">{group.description || 'No description provided yet.'}</p>
                <div className="mt-5">
                  <Badge tone="tertiary">{group.members?.length || 0} Members</Badge>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openInviteCodesModal(group);
                  }}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground bg-secondary px-3 py-1 text-sm font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
                >
                  <Key size={16} strokeWidth={2.5} />
                  Manage Invite Codes
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={selectedGroup ? 'Edit Group' : 'Create Group'}>
        <form className="space-y-5" onSubmit={handleSaveGroup}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Group Name</span>
            <input
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce focus:shadow-pop"
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Description</span>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows="4"
              className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce focus:shadow-pop"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
          >
            {isSubmitting ? 'Saving...' : selectedGroup ? 'Save Group' : 'Create Group'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Group?">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border-2 border-accent bg-accent/10 p-4 text-sm leading-7 text-foreground">
            Deleting <strong>{selectedGroup?.name}</strong> also removes all of its memberships. This cannot be undone.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="flex-1 rounded-full border-2 border-foreground bg-secondary px-6 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteGroup}
              disabled={isSubmitting}
              className="flex-1 rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Group'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={selectedGroup?.name || 'Group Detail'}>
        <div className="space-y-6">
          <div>
            <p className="text-sm leading-7 text-mutedFg">{selectedGroup?.description || 'No description yet.'}</p>
            <div className="mt-4">
              <Badge tone="secondary">{selectedGroup?.members?.length || 0} Members</Badge>
            </div>
          </div>

          <div className="space-y-3 rounded-[1.5rem] border-2 border-border bg-background p-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Add Member</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search students by name"
                className="w-full rounded-lg border-2 border-foreground bg-card px-4 py-3 text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce focus:shadow-pop"
              />
            </label>
            {searchTerm ? (
              <div className="space-y-2">
                {filteredStudents.slice(0, 5).map((student) => (
                  <div key={student._id} className="flex items-center justify-between rounded-xl border-2 border-border bg-card px-4 py-3 shadow-pop-soft">
                    <div>
                      <p className="font-bold text-foreground">{student.name}</p>
                      <p className="text-sm text-mutedFg">{student.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddMember(student._id)}
                      className="rounded-full border-2 border-foreground bg-accent px-4 py-2 text-sm font-bold text-accentFg shadow-pop-press"
                    >
                      Add
                    </button>
                  </div>
                ))}
                {filteredStudents.length === 0 ? <p className="text-sm text-mutedFg">No matching students available.</p> : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            {(selectedGroup?.members || []).map((member) => (
              <div key={member._id} className="flex items-center justify-between rounded-[1.5rem] border-2 border-border bg-background px-4 py-3 shadow-pop-soft">
                <div>
                  <p className="font-bold text-foreground">{member.studentId?.name}</p>
                  <p className="text-sm text-mutedFg">{member.studentId?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.studentId?._id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-accent text-accentFg shadow-pop-press"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {selectedGroup?.members?.length === 0 ? <p className="text-sm text-mutedFg">No members in this group yet.</p> : null}
          </div>
        </div>
      </Modal>

      <InviteCodesPanel
        isOpen={isInviteCodesOpen}
        onClose={() => setIsInviteCodesOpen(false)}
        group={selectedGroup}
      />
    </DashboardLayout>
  );
};

export default GroupManagement;
