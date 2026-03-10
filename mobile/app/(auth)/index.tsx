import { Redirect } from 'expo-router';

// The auth group entry point - redirect to login
export default function AuthIndex() {
    return <Redirect href="/(auth)/login" />;
}
