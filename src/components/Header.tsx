import React, { useEffect } from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import useScrollTrigger from "@material-ui/core/useScrollTrigger";
import netlifyIdentity from "netlify-identity-widget";
import { useDispatch, useSelector } from "react-redux";
import { signIn, signOut } from "../store/slices/authReducer";
import { useRouter } from "next/router";
import Link from "next/link";

import Slide from "@material-ui/core/Slide";
import { Button } from "@mui/material";
import { RootState } from "store/types";
import { persistor } from "store/store";

interface Props {
  children: React.ReactElement;
}

function HideOnScroll(props: Props) {
  const { children } = props;
  const trigger = useScrollTrigger({ target: undefined });

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

export default function Header() {
  const dispatch = useDispatch();

  // Get authentication state and user's username from Redux store
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const full_name = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );

  useEffect(() => {
    netlifyIdentity.init();

    // Check if a user is already logged in
    const currentUser = netlifyIdentity.currentUser();
    if (currentUser) {
      const userData = {
        email: currentUser.email,
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || "",
      };
      dispatch(signIn(userData));
    }

    // Listen for login events
    netlifyIdentity.on("login", (user) => {
      const userData = {
        email: user.email,
        id: user.id,
        full_name: user.user_metadata?.full_name || "",
      };
      console.log("User from netlifyIdentity:", user);
      dispatch(signIn(userData));
      alert("Successfully logged in!");
    });

    // Listen for logout events
    netlifyIdentity.on("logout", () => {
      dispatch(signOut());
      persistor.purge();

      alert("Successfully logged out!");
    });
  }, []);

  const router = useRouter();

  const handleSignup = () => {
    router.push("/useraccount");
    netlifyIdentity.open("signup");
  };

  return (
    <React.Fragment>
      <HideOnScroll>
        <AppBar elevation={0}>
          <Toolbar>
            <Link href="/" passHref>
              <Typography
                variant="h6"
                component="a"
                style={{ cursor: "pointer" }}
              >
                Ankiologernas Notioneringsledger
              </Typography>
            </Link>

            {isAuthenticated ? (
              <>
                {" "}
                <Typography style={{ marginLeft: "2rem" }}></Typography>
                <Button
                  onClick={handleSignup}
                  style={{
                    backgroundColor: "black",
                    color: "white",
                    marginLeft: "2rem",
                  }}
                >
                  Inloggad som {full_name}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSignup}
                style={{
                  backgroundColor: "black",
                  color: "white",
                  marginLeft: "2rem",
                }}
              >
                SIGN IN
              </Button>
            )}
          </Toolbar>
        </AppBar>
      </HideOnScroll>
      <Toolbar />
    </React.Fragment>
  );
}
