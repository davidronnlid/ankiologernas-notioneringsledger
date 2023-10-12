import Layout from "@/components/Layout";
import { Typography } from "@material-ui/core";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { RootState } from "store/types";

function UserAccount() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const full_name = useSelector(
    (state: RootState) => state.auth.user?.full_name
  ); // assuming the user object has a 'username' property
  const router = useRouter();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <Layout>
      <Typography>
        {full_name ? `Welcome, ${full_name}!` : "User account details here"}
      </Typography>
    </Layout>
  );
}

export default UserAccount;
