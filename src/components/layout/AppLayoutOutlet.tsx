import { Outlet } from 'react-router-dom';
import { AppLayout } from './AppLayout';

export function AppLayoutOutlet({ noPadding }: { noPadding?: boolean }) {
    return (
        <AppLayout noPadding={noPadding}>
            <Outlet />
        </AppLayout>
    );
}
