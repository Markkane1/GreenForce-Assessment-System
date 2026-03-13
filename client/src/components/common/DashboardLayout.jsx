import Navbar from './Navbar';
import Sidebar from './Sidebar';

const DashboardLayout = ({ title, children }) => (
  <div className="min-h-screen bg-background">
    <Sidebar />
    <div className="pl-64">
      <Navbar title={title} />
      <main className="p-8">{children}</main>
    </div>
  </div>
);

export default DashboardLayout;
