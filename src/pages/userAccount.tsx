import Layout from "@/components/Layout";
import { Button, Typography } from "@material-ui/core";
import Link from "next/link";
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
  // if (!isAuthenticated) {
  //   router.push("/");
  //   return null;
  // }

  return (
    <Layout>
      <>
        <Typography>
          {full_name ? `Welcome, ${full_name}!` : "User account details here"}
        </Typography>
        <Button>
          <Link href="/">Gå till Notioneringsledger</Link>
        </Button>
      </>
    </Layout>
  );
}

export default UserAccount;
