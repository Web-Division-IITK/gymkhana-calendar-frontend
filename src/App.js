import { useEffect, useState, useRef, createContext } from "react";

// import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import Fab from "@mui/material/Fab";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

import DarkMode from "@mui/icons-material/DarkMode";
import LightMode from "@mui/icons-material/LightMode";

import { ThemeProvider as MuiThemeProvider, THEME_ID, createTheme } from "@mui/material/styles"

import Calendar, { Event } from "./revo-calendar"
import helperFunctions from "./revo-calendar/helpers/functions";

import styled, { ThemeProvider } from "styled-components";

import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword } from "firebase/auth";
import { ref as dbref, push, child, remove, update } from "firebase/database";
import { ref as stref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getToken } from "firebase/messaging";
import { firebaseAuth, firebaseDatabase, firebaseStorage, firebaseMessaging, approvedRef, requestedRef, useFirebase } from "./firebaseUtils";
import './App.css';
import logo from './img/iitk_logo1.png'
import logo_dark from './img/iitk_logo.png'
import MenuIcon from '@mui/icons-material/Menu';
function intToBase64(num) {
	if (num !== Math.round(num)) throw new Error("Not an integer");
	if (num <= 0) throw new Error("Not positive");
	let bytes = []
	for (; num > 0; num = Math.trunc(num / 256)) bytes.unshift(num % 256);
	return btoa(new Uint8Array(bytes));
}

const lightThemeControls = {
	primaryColor: "#333",
	borderColor: "#333",
	secondaryColor: "#fff",
	todayColor: "#49d728",
	textColor: "#000",
	indicatorColor: "orange",
	otherIndicatorColor: "#08e",
	animationSpeed: 300,
}

const darkThemeControls = {
	primaryColor: "#ddd",
	borderColor: "#ddd",
	secondaryColor: "#333",
	todayColor: "#49d728",
	textColor: "#fff",
	indicatorColor: "orange",
	otherIndicatorColor: "#08e",
	animationSpeed: 300,
}

const lightTheme = {
	primaryColor: helperFunctions.getRGBColor(lightThemeControls.primaryColor),
	primaryColor50: helperFunctions.getRGBAColorWithAlpha(helperFunctions.getRGBColor(lightThemeControls.primaryColor), 0.5),
	secondaryColor: helperFunctions.getRGBColor(lightThemeControls.secondaryColor),
	borderColor: helperFunctions.getRGBColor(lightThemeControls.borderColor),
	todayColor: helperFunctions.getRGBColor(lightThemeControls.todayColor),
	textColor: helperFunctions.getRGBColor(lightThemeControls.textColor),
	indicatorColor: helperFunctions.getRGBColor(lightThemeControls.indicatorColor),
	otherIndicatorColor: helperFunctions.getRGBColor(lightThemeControls.otherIndicatorColor),
	animationSpeed: `${lightThemeControls.animationSpeed}ms`,
}

const darkTheme = {
	primaryColor: helperFunctions.getRGBColor(darkThemeControls.primaryColor),
	primaryColor50: helperFunctions.getRGBAColorWithAlpha(helperFunctions.getRGBColor(darkThemeControls.primaryColor), 0.5),
	secondaryColor: helperFunctions.getRGBColor(darkThemeControls.secondaryColor),
	borderColor: helperFunctions.getRGBColor(darkThemeControls.borderColor),
	todayColor: helperFunctions.getRGBColor(darkThemeControls.todayColor),
	textColor: helperFunctions.getRGBColor(darkThemeControls.textColor),
	indicatorColor: helperFunctions.getRGBColor(darkThemeControls.indicatorColor),
	otherIndicatorColor: helperFunctions.getRGBColor(darkThemeControls.otherIndicatorColor),
	animationSpeed: `${darkThemeControls.animationSpeed}ms`,
}

// const theme = darkMode ? darkTheme : lightTheme;
// const calendarTheme = darkMode ? darkThemeControls : lightThemeControls;

const Box = styled.div`
	border: solid 1px ${props => props.theme.borderColor};
	border-radius: 5px;
	padding: 10px;
`

const StyledForm = styled.form`
	border: solid 1px ${props => props.theme.borderColor};
	border-radius: 5px;
	padding: 10px;
`

const StyledImg = styled.img`
	border: solid 1px ${props => props.theme.borderColor};
	border-radius: 5px;
	padding: 10px;
`

const muiConfig = {
	components: {
		MuiButton: {
			defaultProps: {
				variant: "contained"
			}
		}
	}
}

const muiLightTheme = createTheme(muiConfig);
const muiDarkTheme = createTheme({
	...muiConfig,
	palette: { mode: "dark" }
});

const isEmpty = (obj) => {
  for (const prop in obj)
    if (Object.hasOwn(obj, prop))
      return false;
  return true;
}

function NotificationDialog({ setUserNotifToken }) {
	const [notifDialog, setNotifDialog] = useState(
		("Notification" in window) && (Notification.permission === "default")
	); //open notification dialog only if user hasn't accepted/refused notifications

	useEffect(() => {
		//on mount: if notification perms given, set token
		if (!("Notification" in window)) return;
		if (Notification.permission !== "granted") return;
		(async () => {
			getToken(await firebaseMessaging, {
				serviceWorkerRegistration: await navigator.serviceWorker.ready,
				vapidKey: "BAtqNCJaMFjNRNtv0qcgGF_Qg0xu1RjZMZzgeRY_akF5_wC6y5HAP5KvxHjtL8tVdvThTiWHvX617f4xw4r63Q4"
			}).then((currToken) => {
				setUserNotifToken(currToken);
				// 			console.log(currToken);
			}).catch((err) => {
				console.error("Couldn't get notifications token");
				setUserNotifToken("");
				console.error(err);
			});
		})();
	}, [])

	return (
		<Snackbar
			sx={{ width: { sm: "50vw" } }}
			open={notifDialog}
			anchorOrigin={{ vertical: "top", horizontal: "center" }}
			message={<div style={{ width: "100%" }}>Please enable notifications to get alerts on approaching events and changes in time, venue or date.</div>}
			action={<>
				<Button
					sx={{ marginRight: "10px" }}
					onClick={async () => {
						setNotifDialog(false);
						getToken(await firebaseMessaging, {
							serviceWorkerRegistration: await navigator.serviceWorker.ready,
							vapidKey: "BAtqNCJaMFjNRNtv0qcgGF_Qg0xu1RjZMZzgeRY_akF5_wC6y5HAP5KvxHjtL8tVdvThTiWHvX617f4xw4r63Q4"
						}).then((currToken) => {
							setUserNotifToken(currToken);
							console.log(currToken);
						}).catch((err) => {
							console.log("Notifications disabled");
							setUserNotifToken("")
						});
					}}
				>Allow/Disallow</Button>
			</>} />
	)
}

function UnsupportedBrowserDialog() {
	const [isOpen, setOpen] = useState(true);
	return (
		<Snackbar
			sx={{ width: { sm: "50vw" } }}
			open={isOpen}
			onClose={() => { setOpen(false) }}
			autoHideDuration={10000}
			anchorOrigin={{ vertical: "top", horizontal: "center" }}
			message={<div style={{ width: "100%" }}>
				Seems like your browser doesn't support push notifications. If you are using an iPhone, try adding this website to your home screen. Tap the Share icon at the bottom of your screen (next to the Reading List/Book icon) and then tap the 'Add to Home Screen' option in the list.
			</div>}
			action={<Button onClick={() => { setOpen(false) }}>Close</Button>}
		/>
	)
}

export const UserContext = createContext({});

function AddEditEventsDialog({
  dialogOpen,
  dialogEdit,
  closeDialog
}) {

  const addEventFormRef = useRef(null); //ref to add/edit events form that opens when 'Add Event' or 'Edit' is clicked
  
  const [imageURL, setImageURL] = useState("");
	//for add event form submission, using state because it's easier to keep
	//track of than an individual ref to one particular input
	const [imageFile, setImageFile] = useState(null);
	//ditto for the image upload button, still wrapped in a form though
	//might remove that form though
	const [imagePreview, setImagePreview] = useState(null);
	//reading files is async so an effect handles reading the file and putting
	//it into imagePreview for the img tag to display
	const [imageLoading, setImageLoading] = useState(false);
	//loading dialog for when image is uploaded but not previewed yet
	
	
	const [eventError, setEventError] = useState(false); //add event form error status
	const [imageError, setImageError] = useState(false); //image upload error status
  
  const { user, events, entities, privileges, validUsers } = useFirebase();
  
  useEffect(() => {
		//whenever imageFile changes, set up a FileReader to
		//read the data into imagePreview so that the <img> in the
		//upload picture form can display it
		if (imageFile != null) {
			const fr = new FileReader();
			fr.addEventListener("load", () => {
				setImagePreview(fr.result);
			});
			fr.readAsDataURL(imageFile);
		}
	}, [imageFile]);
  
  useEffect(() => {
    //when the dialog is just opened, check if there's a URL in dialogEdit to put in imageURL
    if (dialogOpen !== false && dialogEdit.hasOwnProperty("image")) {
      setImageURL(dialogEdit.image);
    }
  }, [dialogOpen]);
  
  let date = new Date(dialogEdit.date);
	let dialogDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
	
	const clearDialogAndClose = () => {
		setImagePreview(null);
		setImageFile(null);
		setImageURL("");
		setImageLoading(false);
		closeDialog();
	}
	
  return (
  <Dialog
    open={!!dialogOpen}
    onClose={clearDialogAndClose}
    fullWidth
  >
    <Card name="add-event" ref={addEventFormRef} component={StyledForm} id="myform" sx={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px", overflow: "auto" }} onSubmit={async (e) => {
      e.preventDefault();
      let submissionObj = {}
      try {
        let formData = new FormData(addEventFormRef.current);
        console.log(formData);
        //check if start time before end time, otherwise call the user a dumbfuck and stawp
        let [startH, startM] = formData.get("start").split(":");
        let [endH, endM] = formData.get("end").split(":");
        if (Number(startH) >= Number(endH) && Number(startM) >= Number(endM)) {
          setEventError(true);
          throw new Error("Event ends before it starts");
        }
        //check if start time is before right now, if so again fail
        if ((new Date(formData.get("date") + " " + formData.get("start"))).getTime() < Date.now()) {
          setEventError(true);
          throw new Error("Event start time before current time");
        }

        submissionObj = {
          name: formData.get("name"),
          date: (new Date(formData.get("date") + " " + formData.get("start"))).getTime(),
          desc: formData.get("desc"),
          duration: (Number(endH) - Number(startH)) * 60 + (Number(endM) - Number(startM)),
          image: imageURL,
          venue: formData.get("venue"),
          org: formData.get("org")
        }

        if (dialogOpen === "add") {
          //push event!!!						
          await push(requestedRef, submissionObj)
          console.log("Pushed event successfully");
        } else if (dialogOpen === "edit") {
          await update(child(
            (dialogEdit.status === "requested" ? requestedRef : approvedRef),
            dialogEdit.key
          ), submissionObj);
        }
        console.log("Success")
        clearDialogAndClose();
      } catch (err) {
        //something fucked up
        setEventError(true);
        console.error("Error in adding event");
        console.error(err);
        console.error("Event:")
        console.log(submissionObj);
        console.log(dialogEdit);
      }
    }}>
      <h1>{`${dialogOpen === "add" ? "Add" : dialogOpen === "edit" ? "Edit" : "Error"}`} an Event</h1>
      <FormControl fullWidth>
        <InputLabel>Organisation</InputLabel>
        <Select label="Organisation" name="org" defaultValue={dialogEdit.orgKey}>
          <MenuItem value={undefined} disabled />
          {privileges ? Object.keys(privileges).map(el => entities[el] !== undefined && <MenuItem value={el} key={el}>{entities[el].name}</MenuItem>) : ""}
        </Select>
      </FormControl>
      <div style={{ width: "100%", display: "flex", gap: "10px" }}>
        <TextField label="Name" name="name" fullWidth required 
          defaultValue={dialogEdit.name}
        />
        <TextField label="Venue" name="venue" fullWidth required
          defaultValue={dialogEdit.venue}
        />
      </div>
      <TextField label="Description (will be mailed as well)" name="desc" multiline fullWidth required
        defaultValue={dialogEdit.desc}
      />
      <div style={{ display: "flex", width: "100%", gap: "10px" }}>
        <TextField helperText="Date" name="date" type="date" sx={{ flexGrow: "3" }} required 
          defaultValue={dialogDate}
        />
        <TextField helperText="Start Time" name="start" type="time" sx={{ flexGrow: "2" }} required 
          defaultValue={dialogEdit.start}
        />
        <TextField helperText="End Time" name="end" type="time" sx={{ flexGrow: "2" }} required 
          defaultValue={dialogEdit.end}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
        <h3>Upload image (max 5 MB, PNG, JPG, GIF only)</h3>
        <div style={{ display: "flex", width: "100%", gap: "10px", alignItems: "center", justifyContent: "space-between" }}>
          <input type="file" accept=".png,.jpg,.jpeg,.gif" name="file" form="dummy"
            onChange={(e) => {
              setImageFile(e.target.files[0]);
              setImageError(false);
              setImageURL(""); //remove old URL
            }} />
          <Button variant="contained"
            onClick={async () => {
              try {
                //first check if size > 5MB
                if (!imageFile) return; //no image, so do nothing - don't even throw an error
                if (imageFile.size > 5 * 1024 * 1024) throw new Error("Image too big")
                let imageName = intToBase64(Date.now());
                //current time down to the milisecond
                //if I somehow get name conflicts with this.........
                const imageRef = stref(firebaseStorage, imageName, {
                  customMetadata: {
                    //metadata
                    user: user.email
                  }
                });
                console.log("Starting upload...");
                setImageLoading(true);
                await uploadBytes(imageRef, imageFile);
                console.log("Successfully uploaded file, getting URL...");
                let url = await getDownloadURL(imageRef);
                setImageError(false);
                setImageLoading(false);
                setImageURL(url);
                console.log("Success!")

              } catch (err) {
                setImageError(true);
                console.error("Error in uploading image");
                console.error(err);
              }
            }}>Upload</Button>
        </div>
        {imageFile && (
          <div>Image size: {imageFile.size < 1024 ? `${imageFile.size} bytes` : imageFile.size < 1024 * 1024 ? `${(imageFile.size / 1024).toFixed(2)} KB` : `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB`}</div>
        )}
        {imageLoading && (
          <div>Uploading your image...</div>
        )}
        {imageURL !== "" && (
          <div style={{ width: "90%" }}>Successfully uploaded image. If you wish to upload another image, simply select another one (click "Browse...") and then click Upload again. Image URL is {imageURL} and will be attached automatically.</div>
        )}
        {imageError && (
          <div style={{ color: "red" }}>
            Error in uploading image. This could be because:
            <ul>
              <li>The image is bigger than 5 MB</li>
              <li>Some other error, check the console for more details</li>
            </ul>
          </div>)}
        <h5>Image Preview</h5>
        <StyledImg src={!!imageFile ? imagePreview : imageURL} alt="Your uploaded image" style={{ width: "100%" }} />
      </div>
      <Button variant="contained" type="submit">{dialogOpen} Event</Button>
      {eventError && <div style={{ color: "red" }}>
        <p>Error, please check the console for more details. Make sure that: </p>
        <ul>
          <li>The end time of your event is STRICTLY AFTER the start time</li>
          <li>The start time of your event is AFTER the current time (right now). Sorry, no retrospective events!</li>
          <li>You haven't used any weird characters (such as ., #, $, [, ] )</li>
        </ul>
      </div>}
    </Card>
  </Dialog>
  );
}

function Navbar({
  darkMode,
  setDarkMode,
}) {
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [userError, setUserError] = useState(false); //login form error status
	const [addClubError, setAddClubError] = useState(false); //add club form error status
  const [showManage, setShowManage] = useState(false);
  
	const loginFormRef = useRef(null); //ref to login form at bottom of page
	const addClubFormRef = useRef(null);
	
	const { user, events, entities, privileges, validUsers } = useFirebase();
	
	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	const toggleManage = () => {
		setShowManage(!showManage);
	};
	
	const logOut = () => {
	  if (user) {
      signOut(firebaseAuth).catch((err) => {
        console.error('Problem while signing out');
        console.error(err);
      })
	  } 
	}
	
	const userButton = () => {
	  toggleManage();
	}
	
  return (
  <>
  <div
    className="navbar"
    style={{
      position: 'relative',
      top: '0',
      zIndex: '1000',
      width: "100%",
//       backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 10px',
    }}
  >
    <div className="logo">
      <img className="logo" src={darkMode ?  logo: logo_dark } alt="IITK Logo" />
    </div>
    <h1 className="navbar-title"
      style={{
        textAlign: "center",
        color: darkMode ? '#ffffff' : '#000000', 
        flexGrow: 1,
        margin: 0,
      }}
    >
      {"IITK Student's Gymkhana Event Calendar"}
    </h1>
    <div className="icon" >
      <Fab
        variant="contained"
        onClick={() => { setDarkMode(!darkMode); }}
        style={{ marginRight: '10px' }}
        className="icon"
      >
        {darkMode ? <LightMode /> : <DarkMode />}
      </Fab>
      <Button
        className="icon"
        style={{
          borderRadius: "100px"
        }}
        variant="contained"
        onClick={userButton}
      >
        {user ? 'Add User/Sign Out' : 'Log In/Sign Up'}
      </Button>
    </div>
    {/* Hamburger menu */}
    <div className="hamburger-menu" onClick={toggleMenu}>
      <MenuIcon />
    </div>
    {/* Dropdown menu for small screens */}
    {isMenuOpen && (
    <div
      className="dropdown-menu"
      style={{
        position: 'absolute',
        top: '50px',
        right: '10px',
        backgroundColor: darkMode ? '#333' : '#fff',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap:'30px'
        }}
      >
        <Fab
      variant="contained"
      onClick={() => { setDarkMode(!darkMode); }}
      style={{ marginRight: '10px' }}
      className="icon"
    >
      {darkMode ? <LightMode /> : <DarkMode />}
    </Fab>
    <Button
        className="icon"
        style={{
          borderRadius: "1000px"
        }}
        variant="contained"
        onClick={userButton}
      >
        {user ? 'Add User/Sign Out' : 'Log In/Sign Up'}
      </Button>
      </div>
    </div>
    )}
  </div>
  <Dialog 
    open={showManage}
    onClose={() => setShowManage(false)}
    fullWidth
  >
    <Grid
      item
      xs={12}
      style={{
        padding: "20px",
        
      }}
    >
      {user ? (
        <div style={{
          display:"flex",
          flexDirection:"column",
          width:"100%",
          height:"100%",
        }}>
          <div>Note: your UID is {user.uid}.</div>
          {!isEmpty(privileges) && <>
            <form name="addclub"
              ref={addClubFormRef}
              onSubmit={async (e) => {
                try{
                  e.preventDefault();
                  let formData = new FormData(addClubFormRef.current);
                  console.log(formData);
                  let club_short_name_root = formData.get("name").split(" ").map(el => el[0].toLowerCase()).join();
                  let club_short_name = club_short_name_root;
                  let i = 1;
                  while (entities.hasOwnProperty(club_short_name)) {
                    club_short_name = `${club_short_name_root}${i}`;
                    i++;
                  }
                  let council_name = formData.get("council").split(" ")[0].toLowerCase();
                  let approval = formData.get("approval") !== null;
                  let councilwide = formData.get("councilwide") !== null;
                  let role = {};
                  if (councilwide) {
                    role[council_name] = "approve";
                  }
                  if (approval) {
                    role[club_short_name] = "approve";
                  } else {
                    role[club_short_name] = true;
                  }
                  
                  let usersObj = {
                    council: council_name,
                    roles: role,
                  };
                  
                  await update(dbref(firebaseDatabase), {
                    [`entities/${council_name}/${club_short_name}`]: formData.get("name"),
                    [`users/${formData.get('uid')}`]: usersObj
                  });
                  setAddClubError(false);
                  setShowManage(false);
                } catch (err) {
                  console.err(err);
                  setAddClubError(true);
                }
              }}
            >
              <h3 style={{
                textAlign: "center",
                fontSize: "1.1em"
              }}>
                Add Club/Society/Council Organisation Account
              </h3>
              <TextField style={{width: "100%"}}
                label="Enter UID of account belonging to club/society"
                name="uid"
                type="text"
                error={addClubError}
                helperText={addClubError ? 'Error, please check console for more details' : ' '}
                onChange={() => setAddClubError(false)}
              />
              <TextField style={{width: "100%"}}
                label="Enter club name"
                name="name"
                type="text"
                error={addClubError}
                helperText={addClubError ? 'Error, please check console for more details' : ' '}
                onChange={() => setAddClubError(false)}
              />
              <Autocomplete freeSolo={privileges.admin}
                options={privileges ? 
                  Object.keys(privileges)
                  .filter(el => 
                    entities[el] !== undefined 
                    && entities[el].type === "council" 
                    && privileges[el] === "approve")
                  .map(el => `${el.toUpperCase()} Council`) 
                  : []}
                renderInput={(params) => <TextField {...params} label="Council" name="council"/>}
              />
              <FormControlLabel style={{width: "100%"}}
                label="Allow club to publish its own events without GenSec approval?"
                control={<Checkbox name="approval" />}
              />
              <FormControlLabel style={{width: "100%"}}
                label="Allow council-wide event permissions?"
                control={<Checkbox name="councilwide" />}
              />
              <Button type="submit">Add Club Account</Button>
            </form>
          </>}
          <Button style={{margin:"auto"}}
            onClick={logOut}
          >Sign Out</Button>
        </div>
      ) : (
      <form
        name="login"
        ref={loginFormRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          margin: 'auto',
//           color: 'white',
          width: 'fit-content',
        }}
        onSubmit={async (e) => {
          try {
            e.preventDefault();
            let formData = new FormData(loginFormRef.current);
            if (e.nativeEvent.submitter.name === "login-button") {
              await signInWithEmailAndPassword(firebaseAuth, formData.get('email'), formData.get('password'));
            } else {
              await createUserWithEmailAndPassword(firebaseAuth, formData.get('email'), formData.get('password'));
            }
            setUserError(false);
            setShowManage(false);
          } catch (err) {
            console.error(err);
            setUserError(true);
          }
        }}
      >
        <div style={{ display: 'flex', flexDirection: "column", gap: '10px' }}>
          <h3 style={{
            textAlign: "center",
            fontSize: "2em"
          }}>
            Log In:
          </h3>
          <TextField
            label="Enter email"
            name="email"
            type="email"
            error={userError}
            helperText={userError ? 'Error, please check console for more details' : ' '}
            onChange={() => setUserError(false)}
          />
          <TextField
            label="Enter password"
            name="password"
            type="password"
            error={userError}
            helperText=" "
            onChange={() => setUserError(false)}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button variant="contained" type="submit" name="login-button">
            Log in
          </Button>
          or 
          <Button variant="contained" type="submit" name="signup-button">
            sign up
          </Button>
          to add events
        </div>
        <Button
          variant="contained"
          type="button"
          onClick={async () => {
            try {
              let formData = new FormData(loginFormRef.current);
              await sendPasswordResetEmail(firebaseAuth, formData.get('email'));
              alert('A password reset email has been sent. Please follow the instructions in the email to reset your password.');
            } catch (err) {
              console.error('Error in sending password reset email');
              console.error(err);
              setUserError(true);
            }
          }}
        >
          Forgot password?
        </Button>
      </form>
      )}
    </Grid>
  </Dialog>
	</>)
}

function App() {
	const [dialogOpen, setDialog] = useState(false); //events dialog open or not? can be false, "add", or "edit"
	const [dialogEdit, setDialogEdit] = useState({}); //event object  to display in edit events form (if editing event)
	
	const [fbmsgError, setFbmsgError] = useState(false); //if firebase messaging doesn't work, show the 'your browser sux' alert

	const [darkMode, setDarkMode] = useState(
		localStorage.getItem("darkMode") === "true"
	); //light or dark mode, get from localstorage

	const theme = darkMode ? darkTheme : lightTheme;
	const calendarTheme = darkMode ? darkThemeControls : lightThemeControls;
	const muiTheme = darkMode ? muiDarkTheme : muiLightTheme;

	const { user, events, entities, privileges, validUsers } = useFirebase();

	const [userNotifToken, setUserNotifToken] = useState(""); //firebase notification token
	const [subscribedEventKeys, setSubscribedEventKeys] = useState([]); //the keys (event.key) of the event that the token is subscribed to

	//put all the events into one array and set them up for use by other components
	let allEvents = ([
		...(events.approved.map(el => ({ ...el, status: "approved" }))),
		...(events.requested.map(el => ({ ...el, status: "requested" })))
	]).map(event => {
		if (subscribedEventKeys.includes(event.key)) event.subscribed = true;
		else event.subscribed = false;
		return event;
	}).map(event => {
		//these are here to prevent needing prop drilling or a context for all these functions
		event.deleteEvent = (() => { deleteEvent(event) });
		event.editEvent = (() => { editEvent(event) });
		event.editEventApproval = (() => { editEventApproval(event) });
		event.subscribeEvent = (() => { subscribeEvent(event) });
		event.unsubscribeEvent = (() => { unsubscribeEvent(event) });
		return event;
	});

	useEffect(() => {
		//on load: check if firebaseMessaging is null i.e. if messaging is disabled, if so show popup
		(async () => {
			console.log("firebaseMessaging", firebaseMessaging);
			if (await firebaseMessaging === null) {
				console.log("Messaging not supported");
				setFbmsgError(true);
				setUserNotifToken("");
			} else console.log("Messaging supported!")
		})();
	}, []);

	useEffect(() => {
		//whenever darkmode changes, change body background color and save pref to localStorage
		document.body.style.backgroundColor = theme.secondaryColor;
		document.body.style.color = theme.textColor;
		if (darkMode) { //has been set to true
			localStorage.setItem("darkMode", "true");
		} else { //has been set to false
			localStorage.removeItem("darkMode");
		}
	}, [darkMode, theme])

	// useEffect(() => {
	// 		//on load: get user's notification token
	// 		getToken().then((currentToken) => {
	// 			if (currentToken) {
	// 				console.log(currentToken);
	// 				setUserNotifToken(currentToken);
	// 			} else {
	// 				throw new Error();
	// 			}
	// 		}).catch((err) => {
	// 			console.log("Notifications disabled");
	// 		});
	// 	}, [])

	useEffect(() => {
		getSubscribedEventKeys();
	}, [userNotifToken])

	function getSubscribedEventKeys() {
		//gets keys of events that user has subscribed to from the db
		if (userNotifToken === "") return;
		fetch(`${process.env.REACT_APP_NOTIF_SERVER}/getSubscribedEvents?id=${userNotifToken}`).then((resp) => { console.log(resp); return resp; })
			.then((resp) => (resp.json()))
			.then((keys) => { setSubscribedEventKeys(keys); console.log("Subscribed event keys:"); console.log(keys); })
			.catch((err) => {
				console.error(`Error attempting to fetch subscribed events for user token ${userNotifToken}`);
				setUserNotifToken("");
				console.error(err);
			});
	}

	function addEvent(date) {
		// setDialogDate(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`);
		setDialogEdit({date});
		setDialog("add");
	}

	async function deleteEvent(event) {
		try {
			await remove(
				child(
					(event.status === "requested" ? requestedRef : approvedRef),
					event.key
				));
		} catch (err) {
			console.error("Error in deleting event");
			console.error(err);
			console.error(event);
		}
	}

	function editEvent(event) {
		console.log("edit event")
		let date = new Date(event.date);
// 		setDialogDate(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`);
		let end_mins = date.getHours() * 60 + date.getMinutes() + event.duration; //num miliseconds since start of day of date/num miliseconds in a minute
		console.log(end_mins)
		event.start = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
		event.end = `${Math.trunc(end_mins / 60).toString().padStart(2, '0')}:${Math.trunc(end_mins % 60).toString().padStart(2, 0)}`
		console.log(event);
		setDialogEdit(event);
		
		setDialog("edit")
	}

	async function editEventApproval(event) {
		let submissionObj;
		try {
			submissionObj = {
				name: event.name,
				venue: event.venue,
				desc: event.desc,
				image: event.image,
				date: event.date,
				duration: event.duration,
				org: event.orgKey
			}
			if (event.status === "requested") {//then approve the event
				const newKey = await push(child(approvedRef, event.orgKey)).key;
				await update(dbref(firebaseDatabase), {
					[`/requested/${event.key}`]: null,
					[`/approved/${newKey}`]: submissionObj
				});
			} else if (event.status === "approved") {//then unapprove the event i.e. return to requested
				const newKey = await push(child(requestedRef, event.orgKey)).key;
				console.log(newKey);
				await update(dbref(firebaseDatabase), {
					[`/approved/${event.key}`]: null,
					[`/requested/${newKey}`]: submissionObj
				});
			}
			console.log("Successfully approved event");
		} catch (err) {
			console.error("Failed to approve/rescind approval of event")
			console.error(err)
			console.log(submissionObj)
		}
	}

	async function subscribeEvent(event) {
		let resp = await fetch(`${process.env.REACT_APP_NOTIF_SERVER}/subscribeToEvent`, {
			method: "POST",
			mode: "cors",
			body: JSON.stringify({
				userid: String(userNotifToken),
				eventkey: String(event.key)
			})
		});
		let respjson = await resp.json();
		if (!resp.ok) throw new Error(`Failed to subscribe ${userNotifToken} to event ${event.key} with error ${respjson.error}`);
		setSubscribedEventKeys([...subscribedEventKeys, event.key]);
	}

	async function unsubscribeEvent(event) {
		let resp = await fetch(`${process.env.REACT_APP_NOTIF_SERVER}/unsubscribeFromEvent`, {
			method: "POST",
			mode: "cors",
			body: JSON.stringify({
				userid: String(userNotifToken),
				eventkey: String(event.key)
			})
		});
		let respjson = await resp.json()
		if (!resp.ok) throw new Error(`Failed to unsubscribe ${userNotifToken} from event ${event.key} with error ${respjson.error}`);
		setSubscribedEventKeys(subscribedEventKeys.filter(key => key !== event.key));
	}

	function closeDialog() {
		setDialog(false);
		setDialogEdit({});
	}
	
	return (
		<>
			<UserContext.Provider value={{ ...user, userNotifToken }}>
				<ThemeProvider theme={theme}>
					<MuiThemeProvider theme={{ [THEME_ID]: muiTheme }}>
						<NotificationDialog setUserNotifToken={setUserNotifToken} />
						{fbmsgError && <UnsupportedBrowserDialog />}
						<Navbar
						  darkMode={darkMode}
						  setDarkMode={setDarkMode}
						/>
						<AddEditEventsDialog
						  dialogOpen={dialogOpen}
						  dialogEdit={dialogEdit}
						  closeDialog={closeDialog}
						/>
						<div style={{ width: "97.5%", margin: "auto" }}>
							<Grid spacing={2} container sx={{}}>
								<Grid item xs={12} md={8}>
									<Box style={{ padding: "0" }}>
										<Calendar
											allowAddEvent={user}
											events={allEvents}
											addEvent={addEvent}
											privilege={privileges}
											style={{ width: "100%", margin: "auto", flexShrink: "0", padding: "0px" }} />
									</Box>
								</Grid>
								<Grid item xs={12} md={4}>
									<Box style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", backgroundColor: theme.primaryColor, color: theme.secondaryColor, height: "520px" }}>
										<h1>Upcoming Events</h1>
										<div style={{ overflow: "auto" }}>
											{allEvents.filter(event => (event.date - Date.now() > 0) && (event.date - Date.now() < 1000 * 60 * 60 * 24 * 7)).map((event, idx) => (
												<Event
												  event={event}
												  index={idx}
												  key={idx}
												  withDate
												  canEdit={!!privileges[event.orgKey]}
												  canApprove={privileges[event.orgKey] === "approve"}
												  deleteEvent={deleteEvent}
												  editEventApproval={editEventApproval}
												  editEvent={editEvent}
												  primaryColorRGB={theme.primaryColor}
												  style={{ width: "100%", marginBottom: "10px" }}
												/>
											))}
										</div>
									</Box>
								</Grid>
								<Grid item xs={12}>
									<Box style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", backgroundColor: theme.primaryColor, color: theme.secondaryColor, height: "300px" }}>
										<h1>Your Subscribed Events</h1>
										<div style={{ overflow: "auto" }}>
											{allEvents.filter(event => event.subscribed && event.start > Date.now()).map((event, idx) => (
												<Event
												  event={event}
												  index={idx}
												  key={idx}
												  withDate
												  canEdit={!!privileges[event.orgKey]}
												  canApprove={privileges[event.orgKey] === "approve"}
												  deleteEvent={deleteEvent}
												  editEventApproval={editEventApproval}
												  editEvent={editEvent}
												  primaryColorRGB={theme.primaryColor}
												  style={{ width: "100%", marginBottom: "10px" }}
												/>
											))}
										</div>
									</Box>
								</Grid>
							</Grid>

							<Grid item xs={12}>
								<div>Made by the SnT Web Team 23-24:</div>
								<div>Deven Gangwani and Divyansh Mittal</div>
							</Grid>
						</div>
					</MuiThemeProvider>
				</ThemeProvider>
			</UserContext.Provider>
		</>
	);
}
export default App;