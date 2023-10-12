import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { RootState } from "store/types";

function UserAccount() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const username = useSelector((state: RootState) => state.auth.user?.username); // assuming the user object has a 'username' property
  const router = useRouter();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <div>
      {username ? `Welcome, ${username}!` : "User account details here"}
    </div>
  );
}

export default UserAccount;
