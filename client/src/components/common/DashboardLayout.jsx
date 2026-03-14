import Navbar from './Navbar';
import Sidebar from './Sidebar';

const DashboardLayout = ({ title, children }) => (
  <div className="editorial-app-shell min-h-screen lg:block">
    <Sidebar />
    <div className="relative lg:pl-72">
      <Navbar title={title} />
      <main className="relative p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  </div>
);

export default DashboardLayout;
