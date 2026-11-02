import { Redirect } from 'expo-router';

/** Unknown paths (e.g. a host page URL) land on Home. */
export default function NotFound() {
  return <Redirect href="/" />;
}
