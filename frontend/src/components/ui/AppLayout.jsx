import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', width: 'calc(100vw - 220px)', overflowX: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
