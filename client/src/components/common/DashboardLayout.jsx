import Navbar from './Navbar';
import Sidebar from './Sidebar';

const DashboardLayout = ({ title, children }) => (
  <div className="editorial-app-shell min-h-screen">
    <Sidebar />
    <div className="relative pl-72">
      <Navbar title={title} />
      <main className="relative p-8 lg:p-10">{children}</main>
    </div>
  </div>
);

export default DashboardLayout;
