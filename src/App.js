import {useState, useRef, useReducer} from "react";
import {Box, Button, Card, Dialog, FormControl, InputLabel, Grid, MenuItem, Select, TextField} from "@mui/material"
// import logo from './logo.svg';
import './App.css';
import Calendar from "./revo-calendar"
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, connectAuthEmulator } from "firebase/auth";
import { getDatabase, ref, get, push, connectDatabaseEmulator, child } from "firebase/database"

const firebaseConfig = { //it's ok to put these here, I checked
  apiKey: "AIzaSyC8pHMcFe9QcAH-0auLWPwpaIUu3F-UQcw",
//   authDomain: "gymkhanacalendar.firebaseapp.com",
  projectId: "gymkhanacalendar",
//   storageBucket: "gymkhanacalendar.appspot.com",
  messagingSenderId: "74846642585",
  appId: "1:74846642585:web:9abd6791254c250624b308",
//   databaseURL:"https://gymkhanacalendar-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const firebaseDatabase = getDatabase(firebaseApp);
connectDatabaseEmulator(firebaseDatabase, "127.0.0.1", 9000);
connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099");

const entitiesRef = ref(firebaseDatabase, "/entities");
const approvedRef = ref(firebaseDatabase, "/approved");
const requestedRef = ref(firebaseDatabase, "/requested");






function App() {

	const eventTemplate = { //for reference
		name: "",
		date: 0,
		duration: 0,
		org: "",
		image: "",
		desc: "",
		venue: "",
	}
	
	const [events, setEvents] = useState([]); //array of events that will be displayed
	const [dialogOpen, setDialog] = useState(false); //add events dialog open or not?
	const [dialogDate, setDialogDate] = useState(0); //what date to display in the add events form
	const [userError, setUserError] = useState(false); //login form error status
	const [eventError, setEventError] = useState(false); //add event form error status
	const [entities, setEntities] = useState({}); //list of student's gymkhana entities
	const [privileges, setPrivileges] = useState({}) //object storing user privileges for event addition/approval and under which cell
	const [, forceUpdate] = useReducer(x => x + 1, 0); //forces re-render, this is a hack but good for syncing with firebase without irritating onAuthChange etc. stuff
	const loginFormRef = useRef(null); //ref to login form
	const addEventFormRef = useRef(null); //ref to add events form 
	
	
	useState(() => {
		(async () => {
		console.log("Fetching events data...");
		let prev = Number(localStorage.getItem("updateTime")); //null if not present
		console.log(`Prev is ${prev}`);
		if (Date.now() - Number(prev) > 2*60*1000) { //min update time: 2 min
			console.log("Getting events data from db...");
			try {
				let snapshot = await get(approvedRef);
				console.log("Fetched events data");
				console.log(snapshot.val())
				let temp = []
				//first: get approved/entities
				const ent_temp = snapshot.child("entities").val();
				setEntities(ent_temp);
// 				console.log(ent_temp);
				snapshot.forEach(el => {
					if (el.key === "entities") return;
					//event.val() is an object whose values are events and whose keys are the name of the objects in the database
					for (const [key, value] of Object.entries(el.val())) {
						value.org = el.key;
						value.key = key; //for referencing later on if signed in - then updates become dynamic/connection to db opened for constant updates
						temp.push(value);
					}
				});
				temp.sort((a, b) => (a.date - b.date)); //sorts by start time
				console.log(temp);
				localStorage.setItem("events",JSON.stringify(temp));
				localStorage.setItem("entities",JSON.stringify(ent_temp));
				setEvents(temp);
				console.log("Fetched events and entities!");
			} catch (err) {
				console.error("Error in fetching events data");
				console.error(err);
			}
			localStorage.setItem("updateTime", Date.now());
		} else {// get events localStorage
			try {
				let temp = localStorage.getItem("events");
				if (temp == null) throw new Error("No events stored!");
				let ent_temp = localStorage.getItem("entities");
				if (ent_temp == null) throw new Error("No entities stored!");
				setEvents(JSON.parse(temp));
				setEntities(JSON.parse(ent_temp));
			} catch (err) {
				console.error("Error in getting events/entities data locally");
				console.error(err);
			}
		}
		})();
	}, [])
	
	//subscribing to the db when logged in is more complicated
	//should use useSyncExternalStore instead of e.g. useState for managing
	//however, should only subscribe when logged in
	
	const addEvent = (date) => {
		console.log("Event being added")
		console.log(date)
		console.log(addEventFormRef.current);
// 		setAddEventForm({
// 			...addEventForm,
// 			date: date.getTime()
// 		})
		setDialog(true);
	}
	
	
	const deleteEvent = (idx) => {
	
	}

  return (
    <>
    	<h1 style={{ textAlign:"center"}}>{"IITK Student's Gymkhana Event Calendar"}</h1>
    	<Dialog open={dialogOpen} onClose={() => {setDialog(false);}} fullWidth>
      	<Card name="add-event" ref={addEventFormRef} component={"form"} className="box" sx={{width: "100%", display:"flex", flexDirection:"column", gap:"10px"}} onSubmit={async (e) => {
      		e.preventDefault();
      		try {
  	    		let formData = new FormData(addEventFormRef.current);
	      		console.log(formData);
    	  		//check if start time before end time, otherwise call the user a dumbfuck and stawp
		 				let [startH, startM] = formData.get("start").split(":");
						let [endH, endM] = formData.get("end").split(":");
						if (Number(startH) >= Number(endH) && Number(startM) >= Number(endM)) {
					 		setEventError(true);
					 		return;
						}
						//check if start time is before right now, if so again fail
					 	if ((new Date(formData.get("date") + " " + formData.get("start"))).getTime() < Date.now()) {
					 		setEventError(true);
					 		return;
						}
						
						//push event!!!						
						await push(child(requestedRef, formData.get("org")), {
							name:formData.get("name"),
							date:(new Date(formData.get("date") + " " + formData.get("start"))).getTime(),
							desc:formData.get("desc"),
							duration:(Number(endH) - Number(startH))*60 + (Number(endM) - Number(startM)),
							image:"",
							venue:"",
						})
						console.log("Pushed event successfully");
					} catch (err) {
						//something fucked up
						setEventError(true);
						console.error("Error in adding event");
						console.error(err);
					}
				}}>
      		<h1>Add an Event</h1>
      		<FormControl fullWidth>
      			<InputLabel>Organisation</InputLabel>
						<Select label="Organisation" name="org">
							{Object.keys(privileges).map(el => <MenuItem value={el} key={el}>{entities[el]}</MenuItem>)}
						</Select>
					</FormControl>
      		<TextField label="Name" name="name" fullWidth required/>
      		<TextField label="Description (will be mailed as well)" name="desc" multiline fullWidth required/>
      		<div style={{display:"flex", width:"100%", gap: "10px"}}><TextField helperText="Date" name="date" type="date" sx={{flexGrow: "3"}} required/><TextField helperText="Start Time" name="start" type="time" sx={{flexGrow: "2"}} required/><TextField helperText="End Time" name="end" type="time" sx={{flexGrow: "2"}} required/></div>
      		<p>Upload an image</p>
      		<Button variant="contained" type="submit">Add Event (pending GenSec approval)</Button>
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
      <Box sx={{width: "90%", margin:"auto"}}>
				<Grid spacing={6} container>
					<Grid item xs={12} md={8}>
					<Calendar className="box" allowAddEvent={true || firebaseAuth.currentUser} events={events} addEvent={addEvent} style={{width: "100%", margin:"auto", flexShrink: "0", padding:"0px"}}/>
					</Grid>
					<Grid item xs={12} md={4}>
						<Box className="box" sx={{width: "100%"}}>
							<h1>Upcoming Events</h1>
						</Box>
					</Grid>
					<Grid item xs={12}>
					{firebaseAuth.currentUser ?
					(<div style={{width:"100%", display:"flex", justifyContent:"space-evenly"}}>
						<div>Welcome, {firebaseAuth.currentUser?.displayName}. <Button variant="contained" onClick={async () => {
							try {
								await signOut(firebaseAuth);
								forceUpdate();
							} catch (err) {
								console.error("Problem while signing out");
								console.error(err)
							}
						}}>Sign out</Button>?</div>
						
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
								let claims = (await firebaseAuth.currentUser.getIdTokenResult()).claims;
								if (claims.admin) {
									let temp = {}
									for (const entity of Object.keys(entities)) {
										temp[entity] = "approve";
									}
									setPrivileges(temp);
								}
								else setPrivileges(claims.roles);
								forceUpdate();
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
				</Grid>
      </Box>
    </>
  );
}

export default App;
