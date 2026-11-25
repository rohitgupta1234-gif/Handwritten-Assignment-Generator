import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { classNames } from '../../utils/helpers';

interface MainLayoutProps {
  showSidebar?: boolean;
  showHeader?: boolean;
}

export function MainLayout({ showSidebar = true, showHeader = true }: MainLayoutProps) {
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isLandingPage = location.pathname === '/';

  if (isAuthPage || isLandingPage) {
    return (
      <div className="min-h-screen bg-notebook-paper-100">
        {showHeader && !isLandingPage && <Header />}
        <main className={classNames('min-h-screen', showHeader ? 'pt-16' : '')}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-notebook-paper-100 flex">
      {showSidebar && <Sidebar />}
      <div className={classNames('flex-1 flex flex-col min-w-0', showSidebar ? 'lg:ml-0' : '')}>
        {showHeader && <Header />}
        <main className={classNames('flex-1 p-4 lg:p-6 overflow-auto', showHeader ? 'pt-0' : '')}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-notebook-paper-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}

export function LandingLayout() {
  return (
    <div className="min-h-screen bg-notebook-paper-100">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}