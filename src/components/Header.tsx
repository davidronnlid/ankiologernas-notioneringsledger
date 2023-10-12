import React, { useEffect } from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import useScrollTrigger from "@material-ui/core/useScrollTrigger";
import netlifyIdentity from "netlify-identity-widget";
import { useDispatch } from "react-redux";
import { signIn, signOut } from "../store/slices/authReducer";

import Slide from "@material-ui/core/Slide";
import { Button } from "@mui/material";

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

  useEffect(() => {
    netlifyIdentity.init();
    // Listen for login events
    netlifyIdentity.on("login", (user) => {
      dispatch(signIn(user));
      // Show confirmation to user
      alert("Successfully logged in!");
    });

    // Listen for logout events
    netlifyIdentity.on("logout", () => {
      dispatch(signOut());
      // Show confirmation to user
      alert("Successfully logged out!");
    });
  }, []);

  const handleSignup = () => {
    netlifyIdentity.open("signup");
  };

  return (
    <React.Fragment>
      <HideOnScroll>
        <AppBar elevation={0}>
          <Toolbar>
            <Typography variant="h6">
              Ankiologernas Notioneringsledger
            </Typography>{" "}
            <Button
              onClick={handleSignup}
              style={{
                backgroundColor: "black",
                color: "white",
                marginLeft: "2rem",
              }}
            >
              Sign Up
            </Button>
          </Toolbar>
        </AppBar>
      </HideOnScroll>
      <Toolbar />
    </React.Fragment>
  );
}
