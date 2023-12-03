import Layout from "@/components/Layout";
import { Button, Typography } from "@material-ui/core";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "store/types";

function UserAccount() {
  const full_name = useSelector(
    (state: RootState) => state.auth.user?.full_name
  ); // assuming the user object has a 'username' property

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
