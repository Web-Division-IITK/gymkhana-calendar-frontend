import {useEffect, useState, useRef} from "react";

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
import TextField from "@mui/material/TextField";

import DarkMode from "@mui/icons-material/DarkMode";
import LightMode from "@mui/icons-material/LightMode";

import {ThemeProvider as MuiThemeProvider, THEME_ID, createTheme} from "@mui/material/styles"

import Calendar, {Event} from "./revo-calendar"
import helperFunctions from "./revo-calendar/helpers/functions";

import styled, { ThemeProvider } from "styled-components";

import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { ref as dbref, push, child, remove, update } from "firebase/database";
import { ref as stref, uploadBytes, getDownloadURL} from "firebase/storage";
import { firebaseAuth, firebaseDatabase, firebaseStorage, approvedRef, requestedRef, useFirebase } from "./firebaseUtils";

import './App.css';

function intToBase64(num) {
	if (num !== Math.round(num)) throw new Error("Not an integer");
	if (num <= 0) throw new Error("Not positive");
	let bytes = []
	for (; num > 0; num = Math.trunc(num/256)) bytes.unshift(num%256);
	return btoa(new Uint8Array(bytes));
}

const lightThemeControls= {
	primaryColor: "#333",
	secondaryColor: "#fff",
	todayColor: "#49d728",
	textColor: "#000",
	indicatorColor: "orange",
	otherIndicatorColor: "#08e",
	animationSpeed: 300,
}

const darkThemeControls = {
	primaryColor: "#ddd",
	secondaryColor: "#333",
	todayColor: "#49d728",
	textColor: "#fff",
	indicatorColor: "orange",
	otherIndicatorColor: "#08e",
	animationSpeed: 300,
}

const lightTheme={
	primaryColor: helperFunctions.getRGBColor(lightThemeControls.primaryColor),
	primaryColor50: helperFunctions.getRGBAColorWithAlpha(helperFunctions.getRGBColor(lightThemeControls.primaryColor), 0.5),
	secondaryColor: helperFunctions.getRGBColor(lightThemeControls.secondaryColor),
	todayColor: helperFunctions.getRGBColor(lightThemeControls.todayColor),
	textColor: helperFunctions.getRGBColor(lightThemeControls.textColor),
	indicatorColor: helperFunctions.getRGBColor(lightThemeControls.indicatorColor),
	otherIndicatorColor: helperFunctions.getRGBColor(lightThemeControls.otherIndicatorColor),
	animationSpeed: `${lightThemeControls.animationSpeed}ms`,
}

const darkTheme={
	primaryColor: helperFunctions.getRGBColor(darkThemeControls.primaryColor),
	primaryColor50: helperFunctions.getRGBAColorWithAlpha(helperFunctions.getRGBColor(darkThemeControls.primaryColor), 0.5),
	secondaryColor: helperFunctions.getRGBColor(darkThemeControls.secondaryColor),
	todayColor: helperFunctions.getRGBColor(darkThemeControls.todayColor),
	textColor: helperFunctions.getRGBColor(darkThemeControls.textColor),
	indicatorColor: helperFunctions.getRGBColor(darkThemeControls.indicatorColor),
	otherIndicatorColor: helperFunctions.getRGBColor(darkThemeControls.otherIndicatorColor),
	animationSpeed: `${darkThemeControls.animationSpeed}ms`,
}

// const theme = darkMode ? darkTheme : lightTheme;
// const calendarTheme = darkMode ? darkThemeControls : lightThemeControls;

const Box = styled.div `
	border: solid 1px ${props => props.theme.primaryColor};
	border-radius: 5px;
	padding: 10px;
`

const StyledForm = styled.form `
	border: solid 1px ${props => props.theme.primaryColor};
	border-radius: 5px;
	padding: 10px;
`

const StyledImg = styled.img `
	border: solid 1px ${props => props.theme.primaryColor};
	border-radius: 5px;
	padding: 10px;
`

const muiLightTheme = createTheme({});
const muiDarkTheme = createTheme({palette: {mode: "dark"}});

function App() {
	
	const [dialogOpen, setDialog] = useState(false); //events dialog open or not? can be false, "add", or "edit"
	const [dialogDate, setDialogDate] = useState(""); //what date to display in the add events form (if adding event)
	const [dialogEdit, setDialogEdit] = useState({}); //event object  to display in edit events form (if editing event)
	const [userError, setUserError] = useState(false); //login form error status
	const [eventError, setEventError] = useState(false); //add event form error status
	const [imageError, setImageError] = useState(false); //image upload error status
	const [darkMode, setDarkMode] = useState(
		typeof window !== "undefined" &&
		localStorage.getItem("darkMode") === "true"
	); //light or dark mode, get from localstorage
	
	const theme = darkMode ? darkTheme : lightTheme;
	const calendarTheme = darkMode ? darkThemeControls : lightThemeControls;
	const muiTheme = darkMode ? muiDarkTheme : muiLightTheme;

	const [imageURL, setImageURL] = useState(""); 
	//for add event form submission, using state because it's easier to keep
	//track of than an individual ref to one particular input
	const [imageFile, setImageFile] = useState(null);
	//ditto for the image upload button, still wrapped in a form though
	//might remove that form though
	const [imagePreview, setImagePreview] = useState(null);
	//reading files is async so an effect handles reading the file and putting
	//it into imagePreview for the img tag to display

	const loginFormRef = useRef(null); //ref to login form
	const addEventFormRef = useRef(null); //ref to add events form 

	const {user, events, entities, privileges} = useFirebase();	
	
	const allEvents = [...(events.approved.map(el => ({...el, status:"approved"}))), ...(events.requested.map(el => ({...el, status:"requested"})))]
	
	useEffect(() => {
		//whenever darkmode changes, change body background color and save pref to localStorage
		
		document.body.style.backgroundColor = theme.secondaryColor;
		document.body.style.color = theme.textColor;
		if (darkMode) { //has been set to true
			localStorage.setItem("darkMode", "true");
		} else { //has been set to false
			localStorage.removeItem("darkMode");
		}
	}, [darkMode, theme /*tell eslint to stfu */])
	
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
	}, [imageFile])
	
	const addEvent = (date) => {
		setDialogDate(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`);
		setDialog("add");
	}
	
	const deleteEvent = async (event) => {
		try {
			await remove(
			child(
				child(
					(event.status === "requested" ? requestedRef : approvedRef),
					event.orgKey
				),
				event.key
			));
		} catch (err) {
			console.error("Error in deleting event");
			console.error(err);
		}
	}
	
	const editEvent = (event) => {
		console.log("edit event")
		let date = new Date(event.date);
		setDialogDate(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`);
		let end_mins = date.getHours()*60 + date.getMinutes() + event.duration; //num miliseconds since start of day of date/num miliseconds in a minute
		console.log(end_mins)
		event.start = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
		event.end = `${Math.trunc(end_mins/60).toString().padStart(2, '0')}:${Math.trunc(end_mins%60)}`
		console.log(event);
		setDialogEdit(event);
		setImageURL(event.image);
		setDialog("edit")
	}

	const editEventApproval = async (event) => {
		let submissionObj;
		try {
			submissionObj = {
				name: event.name,
				venue:event.venue,
				desc: event.desc,
				image: event.image,
				date: event.date,
				duration: event.duration
			}
			if (event.status === "requested") {//then approve the event
				const newKey = await push(child(approvedRef, event.orgKey)).key;
				await update(dbref(firebaseDatabase), {
					[`/requested/${event.orgKey}/${event.key}`]:null,
					[`/approved/${event.orgKey}/${newKey}`]: submissionObj
				});
			} else if (event.status === "approved") {//then unapprove the event i.e. return to requested
				const newKey = await push(child(requestedRef, event.orgKey)).key;
				console.log(newKey);
				await update(dbref(firebaseDatabase), {
					[`/approved/${event.orgKey}/${event.key}`]:null,
					[`/requested/${event.orgKey}/${newKey}`]: submissionObj
				});
			}
			console.log("Successfully approved event");
		} catch (err) {
			console.error("Failed to approve/rescind approval of event")
			console.error(err)
			console.log(submissionObj)
		}
	}

	const closeDialog = () => {
		setDialog(false);
		setImagePreview(null);
		setImageFile(null);
		setImageURL("");
		setDialogDate("");
		setDialogEdit({});
	}

  return (
    <>
    	<ThemeProvider theme={theme}>
    	<MuiThemeProvider theme={{[THEME_ID]: muiTheme}}>
    	<h1 style={{ textAlign:"center", color:theme.textColor}}>{"IITK Student's Gymkhana Event Calendar"}</h1>
    	<Fab variant="contained" style={{
    		position:"fixed",
    		top: "20px",
    		right: "20px",
    		zIndex:"10000"
    	}}
    	onClick={() => {setDarkMode(!darkMode)}}>{darkMode ? <LightMode /> : <DarkMode />}</Fab>
    	<Dialog open={!!dialogOpen} 
    	onClose={closeDialog} fullWidth>
      	<Card name="add-event" ref={addEventFormRef} component={StyledForm} id="myform" sx={{width: "100%", display:"flex", flexDirection:"column", gap:"10px", overflow:"auto"}} onSubmit={async (e) => {
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
							name:formData.get("name"),
							date:(new Date(formData.get("date") + " " + formData.get("start"))).getTime(),
							desc:formData.get("desc"),
							duration:(Number(endH) - Number(startH))*60 + (Number(endM) - Number(startM)),
							image:imageURL,
							venue:formData.get("venue"),
						}
						
						if (dialogOpen === "add") {
							//push event!!!						
							await push(child(requestedRef, formData.get("org")), submissionObj)
							console.log("Pushed event successfully");
						} else if (dialogOpen === "edit") {
							if (formData.get("org") !== dialogEdit.orgKey) {
								const newKey = await push(child((dialogEdit.status === "requested" ? requestedRef : approvedRef), formData.get("org"))).key;
								await update((dialogEdit.status === "requested" ? requestedRef : approvedRef), {
									[`/${dialogEdit.orgKey}/${dialogEdit.key}`]:null,
									[`${formData.get("org")}/${newKey}`]: submissionObj
								});
							} else {
								await update(child(
									child(
										(dialogEdit.status === "requested" ? requestedRef : approvedRef),
										dialogEdit.orgKey
									),
									dialogEdit.key
								), submissionObj);
							}
						}
						console.log("Success")
						closeDialog();
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
      		<h1>Add an Event</h1>
      		<FormControl fullWidth>
      			<InputLabel>Organisation</InputLabel>
						<Select label="Organisation" name="org" defaultValue={dialogEdit.orgKey}>
							<MenuItem value={undefined} disabled />
							{Object.keys(privileges).map(el => <MenuItem value={el} key={el}>{entities[el]}</MenuItem>)}
						</Select>
					</FormControl>
					<div style={{width:"100%", display:"flex", gap:"10px"}}>
      			<TextField label="Name" name="name" defaultValue={dialogEdit.name} fullWidth required/>
      			<TextField label="Venue" name="venue" defaultValue={dialogEdit.venue} fullWidth required />
      		</div>
      		<TextField label="Description (will be mailed as well)" name="desc" defaultValue={dialogEdit.desc} multiline fullWidth required/>
      		<div style={{display:"flex", width:"100%", gap: "10px"}}>
      			<TextField helperText="Date" name="date" type="date" defaultValue={dialogDate} onChange={(e) => {setDialogDate(e.target.value)}} sx={{flexGrow: "3"}} required/>
      			<TextField helperText="Start Time" name="start" type="time" defaultValue={dialogEdit.start} sx={{flexGrow: "2"}} required/><TextField helperText="End Time" name="end" type="time" defaultValue={dialogEdit.end} sx={{flexGrow: "2"}} required/>
      		</div>
      		<div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:"10px", width: "100%"}}>
      			<h3>Upload image (max 5 MB, PNG, JPG, GIF only)</h3>
      			<div style={{display:"flex", width:"100%", gap: "10px", alignItems:"center", justifyContent:"space-between"}}>
      			<input type="file" accept=".png,.jpg,.jpeg,.gif" name="file" form="dummy"
      			onChange={(e) => {
      				setImageFile(e.target.files[0]);
      				setImageError(false);
      				setImageURL(""); //remove old URL
      			}}/>
      			<Button variant="contained" 
      			onClick={async () => {
      				try {
      				//first check if size > 5MB
      					if (!imageFile) return; //no image, so do nothing - don't even throw an error
								if (imageFile.size > 5*1024*1024) throw new Error("Image too big")
								let imageName = intToBase64(Date.now());
								//current time down to the milisecond
								//if I somehow get name conflicts with this.........
								const imageRef = stref(firebaseStorage, imageName, {customMetadata:{
									//metadata
									user: user.email
								}});
								console.log("Starting upload...");
								await uploadBytes(imageRef, imageFile);
								console.log("Successfully uploaded file, getting URL...");
								let url = await getDownloadURL(imageRef);
								setImageError(false);
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
      			<div>Image size: {imageFile.size < 1024 ? `${imageFile.size} bytes` : imageFile.size < 1024*1024 ? `${(imageFile.size/1024).toFixed(2)} KB` : `${(imageFile.size/(1024*1024)).toFixed(2)} MB`}</div>
      			)}
      			{imageURL !== "" && (
      			<div>Successfully uploaded image. If you wish to upload another image, simply select another one (click "Browse...") and then click Upload again. Image URL is {imageURL} and will be attached automatically.</div>
      			)}
      			{imageError && (
      			<div style={{color:"red"}}>
      			Error in uploading image. This could be because:
      			<ul>
      				<li>The image is bigger than 5 MB</li>
      				<li>Some other error, check the console for more details</li>
      			</ul>
      			</div>)}
      			<h5>Image Preview</h5>
      			<StyledImg src={!!imageFile ? imagePreview : imageURL} alt="Your uploaded image" style={{width:"100%"}}/>
      		</div>
      		<Button variant="contained" type="submit">{dialogOpen} Event</Button>
      		{eventError && <div style={{color:"red"}}>
      			<p>Error, please check the console for more details. Make sure that: </p>
      			<ul>
      				<li>The end time of your event is STRICTLY AFTER the start time</li>
      				<li>The start time of your event is AFTER the current time (right now). Sorry, no retrospective events!</li>
      				<li>You haven't used any weird characters (such as ., #, $, [, ] )</li>
      			</ul>
      		</div>}
      	</Card>
      </Dialog>
      <div style={{width: "97.5%", margin:"auto"}}>
				<Grid spacing={2} container sx={{}}>
					<Grid item xs={12} md={9}>
					<Box style={{padding: "0"}}><Calendar allowAddEvent={user} events={allEvents} addEvent={addEvent} deleteEvent={deleteEvent} editEvent={editEvent} editEventApproval={editEventApproval} privilege={privileges} style={{width: "100%", margin:"auto", flexShrink: "0", padding:"0px"}}/></Box>
					</Grid>
					<Grid item xs={12} md={3}>
						<Box style={{display:"flex", flexDirection:"column", gap:"10px",width: "100%", backgroundColor:theme.primaryColor, color:theme.secondaryColor, height:"520px"}}>
							<h1>Upcoming Events</h1>
							<div style={{overflow:"auto"}}>
							{allEvents.filter(event => (event.date - Date.now() > 0) && (event.date - Date.now() < 1000*60*60*24*7)).map((event, idx) => (
							<Event event={event} index={idx} withDate canEdit={!!privileges[event.orgKey]} canApprove={privileges[event.orgKey] === "approve"} deleteEvent={deleteEvent} editEventApproval={editEventApproval} editEvent={editEvent} primaryColorRGB={theme.primaryColor} style={{width:"100%", marginBottom:"10px"}} />
							))}
							</div>
						</Box>
					</Grid>
					<Grid item xs={12}>
					{firebaseAuth.currentUser ?
					(<div style={{width:"100%", display:"flex", justifyContent:"space-evenly"}}>
						<div>Welcome, {firebaseAuth.currentUser?.email}.
						<Button variant="contained" 
							onClick={() => (signOut(firebaseAuth)
							.catch((err) => {
								console.error("Problem while signing out");
								console.error(err)
							}))
						}>Sign out</Button>?
						</div>
					</div>) :
					(<h3
					>
						<form name="login" ref={loginFormRef} style={{
							display:"flex",
							flexDirection:"column", 
							alignItems:"center", 
							gap:"10px", 
							margin:"auto", 
							width:"fit-content"}}
						onSubmit={async (e) => {
							try {
								e.preventDefault();
								let formData = new FormData(loginFormRef.current)
// 								console.log(formData.get("email"))
// 								console.log(formData.get("password"))
// 								console.log(firebaseAuth.currentUser)
								await signInWithEmailAndPassword(firebaseAuth, formData.get("email"), formData.get("password"));
								setUserError(false); 
								// console.log(firebaseAuth.currentUser);
							} catch (err) {
								console.error(err)
								setUserError(true);
							}
						}}>
						<div style={{display:"flex", gap:"10px"}}>
						<TextField label="Enter email" name="email" type="email" error={userError} helperText={userError ? "Error, please check console for more details" : " "} onChange={() => setUserError(false)}/>
						<TextField label="Enter password" name="password" type="password" error={userError} helperText=" " onChange={() => setUserError(false)} />
						</div>
						<div style={{display:"flex", gap:"10px", alignItems:"center"}}>
						<Button variant="contained" type="submit" >Log in</Button>to add events
						</div>
						<Button variant="contained" type="button" onClick={async () => {
							try {
								let formData = new FormData(loginFormRef.current)
								await sendPasswordResetEmail(firebaseAuth, formData.get("email"))
								alert("A password reset email has been sent. Please follow the instructions in the email to reset your password.")
							} catch (err) {
								console.error("Error in sending password reset email")
								console.error(err);
								setUserError(true);
							}
						}}>Forgot password?</Button>
						</form>
					</h3>)
					}</Grid>
					<Grid item xs={12}>
					<div>Made by the SnT Web Team 23-24:</div>
					<div>Deven Gangwani and Divyansh Mittal</div>
					</Grid>
				</Grid>
      </div>
  		</MuiThemeProvider>
  		</ThemeProvider>
    </>
  );
}

export default App;
