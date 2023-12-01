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
import Image from "next/image";

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

  const profile_pic = useSelector(
    (state: RootState) => state.auth.user?.profile_pic
  );

  console.log("profile_pic", profile_pic);

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
      router.push("/useraccount");
    });

    // Listen for logout events
    netlifyIdentity.on("logout", () => {
      dispatch(signOut());
      persistor.purge();
    });
  }, []);

  const router = useRouter();

  const handleSignup = () => {
    netlifyIdentity.open("signup");
  };

  return (
    <React.Fragment>
      <HideOnScroll>
        <AppBar
          elevation={0}
          style={{ position: "relative", minHeight: "6rem" }}
        >
          <Toolbar
            style={{
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 3rem",
            }}
          >
            <div
              style={{ position: "absolute", top: "1.5rem", left: "1.5rem" }}
            >
              <Link href="/" passHref>
                <a
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ borderRadius: "50%", overflow: "hidden" }}>
                    <Image
                      src={"/images/logo.png"}
                      alt="Ankiologerna Logo"
                      width={40}
                      height={40}
                      layout="fixed"
                    />
                  </div>
                  <Typography variant="h6">
                    Ankiologernas Notioneringsledger
                  </Typography>
                </a>
              </Link>
            </div>

            {isAuthenticated && (
              <div
                style={{ position: "absolute", top: "1.5rem", right: "1.5rem" }}
              >
                <Button onClick={handleSignup} style={{ padding: 0 }}>
                  <div style={{ borderRadius: "50%", overflow: "hidden" }}>
                    <Image
                      src={
                        profile_pic
                          ? profile_pic
                          : "/images/default_profile.png"
                      } // Set a default profile picture
                      alt="User profile image"
                      width={40}
                      height={40}
                      layout="fixed"
                    />
                  </div>
                </Button>
              </div>
            )}

            {!isAuthenticated && (
              <Button
                onClick={handleSignup}
                style={{
                  position: "absolute",
                  top: "1.5rem",
                  right: "1.5rem",
                  backgroundColor: "black",
                  color: "white",
                }}
              >
                LOGGA IN
              </Button>
            )}
          </Toolbar>
        </AppBar>
      </HideOnScroll>
      <Toolbar />
    </React.Fragment>
  );
}
