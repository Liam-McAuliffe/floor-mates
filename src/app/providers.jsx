'use client';
import { SessionProvider, useSession } from 'next-auth/react';
import store from '@/store/store';
import { useEffect } from 'react';
import { fetchUserProfile, selectUserStatus } from '@/store/slices/userSlice';
import {
  Provider as ReduxProvider,
  useDispatch,
  useSelector,
} from 'react-redux';

function AuthWrapper({ children }) {
  const { status: sessionStatus } = useSession();
  const dispatch = useDispatch();
  const userProfileStatus = useSelector(selectUserStatus);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && userProfileStatus === 'idle') {
      console.log('[AuthWrapper] Dispatching fetchUserProfile...');
      dispatch(fetchUserProfile());
    }
    if (sessionStatus === 'unauthenticated' && userProfileStatus !== 'idle') {
      dispatch(clearUser());
    }
  }, [sessionStatus, userProfileStatus, dispatch]);
  return <>{children}</>;
}

export function Providers({ children }) {
  return (
    <SessionProvider>
      <ReduxProvider store={store}>
        <AuthWrapper>{children}</AuthWrapper>
      </ReduxProvider>
    </SessionProvider>
  );
}
