import {useEffect, useState, useRef, useReducer, useSyncExternalStore} from "react";
import {Box, Button, Card, Dialog, FormControl, InputLabel, Grid, MenuItem, Select, TextField} from "@mui/material"
// import logo from './logo.svg';
import './App.css';
import Calendar from "./revo-calendar"
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged, connectAuthEmulator } from "firebase/auth";
import { getDatabase, ref, get, push, connectDatabaseEmulator, child, onValue } from "firebase/database";
import { getStorage, connectStorageEmulator} from "firebase/storage";

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
const firebaseStorage = getStorage(firebaseApp);

connectDatabaseEmulator(firebaseDatabase, "127.0.0.1", 9000);
connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099");
connectStorageEmulator(firebaseStorage, "127.0.0.1", 9199);

const entitiesRef = ref(firebaseDatabase, "/entities");
const approvedRef = ref(firebaseDatabase, "/approved");
const requestedRef = ref(firebaseDatabase, "/requested");

const firebaseAuthStore = {
	subscribe(callback) {
		return onAuthStateChanged(firebaseAuth, callback)
	},
	getSnapshot() {
		return firebaseAuth.currentUser
	}
}

const firebaseEventsStore = {
	events: {
		approved: [],
		requested: []
	}, //initialize as empty
	//separated like that because then it's easier to update when signed in
	//(this is how it is stored in the database too)
	entities: {},
	returnValue: {events: null, entities: null}, //needed for "caching" and because I don't feel like separating this into another object
	//(react needs to get the same object back if there is no update)
	eventsUnsub: () => {}, //initialize as 'empty' function
	authUnsub: null,
	subscribe(callback) {
		console.log("subscribe called");
		//point of this: when not signed in, subscribing just fetches events and entities
		//once and then stops
		if (!firebaseAuth.currentUser) {
			(async () => {
			console.log("Not signed in");
			console.log("Fetching events data...");
			let prev = Number(localStorage.getItem("updateTime")); //null if not present
			console.log(`Prev is ${prev}`);
			if (Date.now() - Number(prev) > 5*60*1000) { //min update time: 5 min
				console.log("Getting events data from db...");
				try {
					let snapshot = await get(approvedRef);
					console.log("Fetched events data");
					//clear old events
					this.events.approved = [];
					console.log(snapshot.val())
					//first: get approved/entities
					this.entities = snapshot.child("entities").val();
					//'this' should work inside arrow functions because it should use subscribe's version of this i.e. the object
					snapshot.forEach(el => {
						if (el.key === "entities") return;
						//event.val() is an object whose values are events and whose keys are the name of the objects in the database
						for (const [key, value] of Object.entries(el.val())) {
							value.org = el.key;
							value.key = key; //for referencing later on if signed in - then updates become dynamic/connection to db opened for constant updates
							this.events.approved.push(value);
						}
					});
					this.events.approved.sort((a, b) => (a.date - b.date)); //sorts by start time
					localStorage.setItem("events",JSON.stringify(this.events.approved));
					localStorage.setItem("entities",JSON.stringify(this.entities));
					console.log("Fetched events and entities!");
				} catch (err) {
					console.error("Error in fetching events data");
					console.error(err);
				}
				localStorage.setItem("updateTime", Date.now());
			} else {// get events localStorage
				try {
					this.events.approved = localStorage.getItem("events");
					if (this.events.approved == null) throw new Error("No events stored!");
					this.entities = localStorage.getItem("entities");
					if (this.entities == null) throw new Error("No entities stored!");
					this.events.approved = JSON.parse(this.events.approved);
					this.entities = JSON.parse(this.entities);
				} catch (err) {
					console.error("Error in getting events/entities data locally");
					console.error(err);
				}
			}
			//either way, once everything is done, execute the callback so that react fetches new data
			callback();
			//no cleanup necessary to unsubscribe here
			})(); //anonymous async function executed immediately
		}
		//when signed in: sets up a callback for events and entities
		//on auth change: if signing out: clean up ^ call back
		this.authUnsub = onAuthStateChanged(firebaseAuth, () => {
			//plan: we use onAuthState to set up the callback for events and entities
			//we can store the callback in eventsUnsub so shouldn't be a problem...?
			console.log("onAuthStateChanged callback");
			if (firebaseAuth.currentUser) {
				//signed in -> set up callback
				let approvedUnsub = onValue(approvedRef, (snapshot) => {
					console.log("New approved events data");
					// console.log(snapshot);
					//clear old approved events
					this.events.approved = [];
					snapshot.forEach(el => {
						if (el.key === "entities") return;
						for (const [key, value] of Object.entries(el.val())) {
							value.org = el.key;
							value.key = key; //for referencing later on if signed in - then updates become dynamic/connection to db opened for constant updates
							//(if I decide to start using onChildAdded/Changed/Deleted etc. type updates... in the future)
							this.events.approved.push(value);
						}
					})
					this.events.approved.sort((a, b) => (a.date - b.date)); //sorts by start time
					localStorage.setItem("events",JSON.stringify(this.events.approved));
					//call the callback to notify that there is an update
					callback();	
				})
				let requestedUnsub = onValue(requestedRef, (snapshot) => {
					console.log("New requested events data");
					// console.log(snapshot)
					//clear old requested events
					this.events.requested = [];
					snapshot.forEach(el => {
						for (const [key, value] of Object.entries(el.val())) {
							value.org = el.key;
							value.key = key; //for referencing later on if signed in - then updates become dynamic/connection to db opened for constant updates
							//(if I decide to start using onChildAdded/Changed/Deleted etc. type updates... in the future)
							this.events.requested.push(value);
						}
					})
					this.events.requested.sort((a, b) => (a.date - b.date)); //sorts by start time
					//call the callback
					callback();	
				})
				this.eventsUnsub = () => {
					//these should be captured because closure
					console.log("unsubscribed")
					approvedUnsub();
					requestedUnsub();
				}
			} else { //i.e. when signing out
				console.log("signout unsub");
				this.eventsUnsub(); //unsubscribe from everything
				this.eventsUnsub = () => {
					
				};
			}
		});
		return () => {
			this.eventsUnsub();
			this.authUnsub();
		}
	},
	getSnapshot() {
		this.returnValue.events = this.events;
		this.returnValue.entities = this.entities; 
		//if there is no change in either there should be no change in returnValue
		return this.returnValue; 
	}
}
			

function useFirebase() {//hook to abstract all firebase details
	const user = useSyncExternalStore(firebaseAuthStore.subscribe, firebaseAuthStore.getSnapshot);
	const {events, entities} = useSyncExternalStore(
		firebaseEventsStore.subscribe.bind(firebaseEventsStore), 
		firebaseEventsStore.getSnapshot.bind(firebaseEventsStore)
	);
	//^ both functions use 'this' liberally so need to bind 'this' to firebaseEventsStore
	const [privileges, setPrivileges] = useState({});
	console.log({
		user,
		events,
		entities
	})
	useEffect(()=> {
		(async () => {
		if (user) {
			let claims = (await firebaseAuth.currentUser.getIdTokenResult()).claims;
			if (claims.admin) {
				let temp = {}
				for (const entity of Object.keys(entities)) {
					temp[entity] = "approve";
				}
				setPrivileges(temp);
			}
			else setPrivileges(claims.roles);
		} else {
			setPrivileges({});
		}
		})();
	},[user]);
	
	return {
		user,
		events,
		entities,
		privileges
	}
}

function App() {

	const eventTemplate = { //for reference
		name: "",
		date: 0,
		duration: 0,
		org: "",
		image: "",
		desc: "",
		venue: "",
		key: ""
	}
	
	const [dialogOpen, setDialog] = useState(false); //add events dialog open or not?
	const [dialogDate, setDialogDate] = useState(0); //what date to display in the add events form
	const [userError, setUserError] = useState(false); //login form error status
	const [eventError, setEventError] = useState(false); //add event form error status
	const [imageError, setImageError] = useState(false); //image upload error status

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

//v depend on auth state so they have been moved to useFirebase
// 	const [entities, setEntities] = useState({}); //list of student's gymkhana entities
// 	const [privileges, setPrivileges] = useState({}) //object storing user privileges for event addition/approval and under which cell
// 	const [events, setEvents] = useState([]); //array of events that will be displayed
	
	const {user, events, entities, privileges} = useFirebase();
	//using the hook above
	
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
    	<Dialog open={dialogOpen} 
    	onClose={() => {
    		setDialog(false);
    		setImagePreview(null);
    		setImageFile(null);
    	}} fullWidth>
      	<Card name="add-event" ref={addEventFormRef} component={"form"} className="box" id="myform" sx={{width: "100%", display:"flex", flexDirection:"column", gap:"10px", overflow:"auto"}} onSubmit={async (e) => {
      		e.preventDefault();
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
      		<div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:"10px", width: "100%"}}>
      			<h3>Upload image (max 5 MB, PNG, JPG, GIF only)</h3>
      			<div style={{display:"flex", width:"100%", gap: "10px", alignItems:"center", justifyContent:"space-between"}}>
      			<input type="file" accept=".png,.jpg,.jpeg,.gif" name="file" form="dummy"
      			onChange={(e) => {
      				setImageFile(e.target.files[0]);
      				setImageError(false);
      			}}/>
      			<Button variant="contained" 
      			onClick={() => {
      				try {
      				//first check if size > 5MB
								if (imageFile.size > 5*1024*1024) {
									throw new Error("Image too big")
								}
								
								
							} catch (err) {
								setImageError(true);
								console.error("Error in uploading image");
								console.error(err);
							}
      			}}>Upload</Button>
      			</div>
      			{imageError ? (
      			<div style={{color:"red"}}>
      			Error in uploading image. This could be because:
      			<ul>
      				<li>The image is bigger than 5 MB</li>
      				<li>Some other error, check the console for more details</li>
      			</ul>
      			</div>) : ""}
      			<h5>Image Preview</h5>
      			<img src={imagePreview} alt="Your uploaded image" className="box" style={{width:"100%"}}/>
      		</div>
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
					<Calendar className="box" allowAddEvent={true || firebaseAuth.currentUser} events={events.approved} addEvent={addEvent} style={{width: "100%", margin:"auto", flexShrink: "0", padding:"0px"}}/>
					</Grid>
					<Grid item xs={12} md={4}>
						<Box className="box" sx={{width: "100%"}}>
							<h1>Upcoming Events</h1>
						</Box>
					</Grid>
					<Grid item xs={12}>
					{firebaseAuth.currentUser ?
					(<div style={{width:"100%", display:"flex", justifyContent:"space-evenly"}}>
						<div>Welcome, {firebaseAuth.currentUser?.displayName}.
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
				</Grid>
      </Box>
    </>
  );
}

export default App;
