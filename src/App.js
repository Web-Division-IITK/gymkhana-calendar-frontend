import {useEffect, useState, useRef, useReducer, useSyncExternalStore} from "react";
import {Box, Button, Card, Dialog, FormControl, InputLabel, Grid, MenuItem, Select, TextField} from "@mui/material"
// import logo from './logo.svg';
import './App.css';
import Calendar, {Event} from "./revo-calendar"
import helperFunctions from "./revo-calendar/helpers/functions";
import { ThemeProvider } from "styled-components";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged, connectAuthEmulator } from "firebase/auth";
import { getDatabase, ref as dbref, get, push, connectDatabaseEmulator, child, onValue, remove, update } from "firebase/database";
import { getStorage, connectStorageEmulator, ref as stref, uploadBytes, getDownloadURL} from "firebase/storage";

const firebaseConfig = { //it's ok to put these here, I checked
  apiKey: "AIzaSyC8pHMcFe9QcAH-0auLWPwpaIUu3F-UQcw",
//   authDomain: "gymkhanacalendar.firebaseapp.com",
  projectId: "gymkhanacalendar",
  storageBucket: "gymkhanacalendar.appspot.com",
  messagingSenderId: "74846642585",
  appId: "1:74846642585:web:9abd6791254c250624b308",
//   databaseURL:"https://gymkhanacalendar-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

function intToBase64(num) {
	if (num != Math.round(num)) throw new Error("Not an integer");
	if (num <= 0) throw new Error("Not positive");
	let bytes = []
	for (; num > 0; num = Math.trunc(num/256)) bytes.unshift(num%256);
	return btoa(new Uint8Array(bytes));
}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const firebaseDatabase = getDatabase(firebaseApp);
const firebaseStorage = getStorage(firebaseApp);

connectDatabaseEmulator(firebaseDatabase, "127.0.0.1", 9000);
connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099");
connectStorageEmulator(firebaseStorage, "127.0.0.1", 9199);

const entitiesRef = dbref(firebaseDatabase, "/entities");
const approvedRef = dbref(firebaseDatabase, "/approved");
const requestedRef = dbref(firebaseDatabase, "/requested");

const firebaseAuthStore = {
	subscribe(callback) {
		return onAuthStateChanged(firebaseAuth, callback)
	},
	getSnapshot() {
		return firebaseAuth.currentUser
	}
}

//some helper functions for firebaseEventsStore
function unpackEvents(snapshot, status, entities) {
// 	console.log(`unpackEvents ${status}`)
	let eventsArr = []
	snapshot.forEach(el => {
		if (el.key === "entities") return;
		//event.val() is an object whose values are events and whose keys are the name of the objects in the database
		for (const [key, value] of Object.entries(el.val())) {
			value.org = entities[el.key];
			value.orgKey = el.key;
			value.key = key; //for referencing later on if signed in - then updates become dynamic/connection to db opened for constant updates
			value.status = status;
			eventsArr.push(value);
		}
	});
	eventsArr.sort((a, b) => (a.date - b.date)); //sorts by start time
// 	console.log(eventsArr);
	return eventsArr;
}

const firebaseEventsStore = {
	returnValue: {
		events: {
			approved: [],
			requested: []
		},
		entities: {}}, //needed for "caching" and because I don't feel like separating this into another store
	//(react needs to get the same object back if there is no update)
	eventsUnsub: () => {}, //initialize as 'empty' function
	authUnsub: null,
	setReturnValue(obj) {
		this.returnValue = {
			...this.returnValue,
			...obj
		}
	},
	subscribe(callback) {
// 		console.log("subscribe called");
		//point of this: when not signed in, subscribing just fetches events and entities
		//once and then stops
		if (!firebaseAuth.currentUser) {
			(async () => {
// 			console.log("Not signed in");
// 			console.log("Fetching events data...");
			let prev = Number(localStorage.getItem("updateTime")); //null if not present
			// console.log(`Prev is ${prev}`);
			if (Date.now() - Number(prev) > 5*60*1000) { //min update time: 5 min
				// console.log("Getting events data from db...");
				try {
					let snapshot = await get(approvedRef);
					// console.log("Fetched events data");
// 					console.log(snapshot.val())
					//first: get approved/entities
					let entities_temp = snapshot.child("entities").val();
					this.setReturnValue({
						entities: entities_temp,
						events: {
							approved: unpackEvents(snapshot, "approved", entities_temp),
							requested: this.returnValue.events.requested,
						}
					})
					localStorage.setItem("events",JSON.stringify(this.returnValue.events.approved));
					localStorage.setItem("entities",JSON.stringify(this.returnValue.entities));
					console.log("Fetched events and entities!");
				} catch (err) {
					console.error("Error in fetching events data");
					console.error(err);
				}
				localStorage.setItem("updateTime", Date.now());
			} else {// get events localStorage
				try {
					let events_approved_temp = localStorage.getItem("events");
					if (events_approved_temp == null) throw new Error("No events stored!");
					let entities_temp = localStorage.getItem("entities");
					if (entities_temp == null) throw new Error("No entities stored!");
					this.setReturnValue({
						entities: JSON.parse(entities_temp),
						events: {
							approved: JSON.parse(events_approved_temp),
							requested: this.returnValue.events.requested,
						}
					})
				} catch (err) {
					console.error("Error in getting events/entities data locally");
					console.error(err);
				}
			}
			//either way, once everything is done, execute the callback so that react fetches new data
// 			console.log("callback called");
			callback();
			//no cleanup necessary to unsubscribe here
			})(); //anonymous async function executed immediately
		}
		//when signed in: sets up a callback for events and entities
		//on auth change: if signing out: clean up ^ call back
		this.authUnsub = onAuthStateChanged(firebaseAuth, () => {
			//plan: we use onAuthState to set up the callback for events and entities
			//we can store the callback in eventsUnsub so shouldn't be a problem...?
			// console.log("onAuthStateChanged callback");
			if (firebaseAuth.currentUser) {
				//signed in -> set up callback
				let approvedUnsub = onValue(approvedRef, (snapshot) => {
// 					console.log("New approved events data");
					// console.log(snapshot);
					this.setReturnValue({
						events: {
							approved: unpackEvents(snapshot, "approved", this.returnValue.entities),
							requested: this.returnValue.events.requested,
						}
					})
					localStorage.setItem("events",JSON.stringify(this.returnValue.events.approved));
					//call the callback to notify that there is an update
					callback();	
				})
				let requestedUnsub = onValue(requestedRef, (snapshot) => {
// 					console.log("New requested events data");
					// console.log(snapshot)
					this.setReturnValue({
						events: {
							approved: this.returnValue.events.approved,
							requested: unpackEvents(snapshot, "requested", this.returnValue.entities),
						}
					})
					//call the callback
					callback();	
				})
				this.eventsUnsub = () => {
					//these should be captured because closure
					// console.log("unsubscribed")
					approvedUnsub();
					requestedUnsub();
				}
			} else { //i.e. when signing out
				// console.log("signout unsub");
				this.setReturnValue({
					events:{
						approved: this.returnValue.events.approved,
						requested: []
					}
				})
				this.eventsUnsub(); //unsubscribe from everything
				this.eventsUnsub = () => {};
			}
		});
		return () => {
			this.eventsUnsub();
			this.authUnsub();
		}
	},
	getSnapshot() {
// 		console.log("Events requested");
// 		console.log("approved");
// 		this.returnValue.events.approved.forEach(el => {console.log(el)})
// 		console.log("requested");
// 		this.returnValue.events.requested.forEach(el => {console.log(el)})
		return this.returnValue; 
	}
}
			
const firebaseEventsSubscribe = firebaseEventsStore.subscribe.bind(firebaseEventsStore);
const firebaseEventsSnapshot = firebaseEventsStore.getSnapshot.bind(firebaseEventsStore);

function useFirebase() {//hook to abstract all firebase details
	const user = useSyncExternalStore(firebaseAuthStore.subscribe, firebaseAuthStore.getSnapshot);
	const {events, entities} = useSyncExternalStore(
		firebaseEventsSubscribe, 
		firebaseEventsSnapshot
	);
	//^ both functions use 'this' liberally so need to bind 'this' to firebaseEventsStore
	
// 	console.log("Refreshing")
	
	const [privileges, setPrivileges] = useState({});
	// console.log({
// 		user,
// 		events,
// 		entities
// 	})
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
	},[user, entities]); //user may load before entities so re-run whenever entities is filled
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
	
	
	
	const themeControls={
		primaryColor: "#333",
		secondaryColor: "#fff",
		todayColor: "#3B3966",
		textColor: "#f00",
		indicatorColor: "orange",
		otherIndicatorColor: "#08e",
		animationSpeed: 300,
	}
	const theme={
		primaryColor: helperFunctions.getRGBColor(themeControls.primaryColor),
		primaryColor50: helperFunctions.getRGBAColorWithAlpha(helperFunctions.getRGBColor(themeControls.primaryColor), 0.5),
		secondaryColor: helperFunctions.getRGBColor(themeControls.secondaryColor),
		todayColor: helperFunctions.getRGBColor(themeControls.todayColor),
		textColor: helperFunctions.getRGBColor(themeControls.textColor),
		indicatorColor: helperFunctions.getRGBColor(themeControls.indicatorColor),
		otherIndicatorColor: helperFunctions.getRGBColor(themeControls.otherIndicatorColor),
		animationSpeed: `${themeControls.animationSpeed}ms`,
	}
	
	const [dialogOpen, setDialog] = useState(false); //events dialog open or not? can be false, "add", or "edit"
	const [dialogDate, setDialogDate] = useState(""); //what date to display in the add events form (if adding event)
	const [dialogEdit, setDialogEdit] = useState({}); //event object  to display in edit events form (if editing event)
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
	
	const allEvents = [...(events.approved.map(el => ({...el, status:"approved"}))), ...(events.requested.map(el => ({...el, status:"requested"})))]
	
// 	useEffect(() => {
// 		console.log("events updated");
// 	}, [events])
	
// 	console.log("events");
// 	console.log("approved");
// 	events.approved.forEach(el => {console.log(el)})
// 	console.log("requested");
// 	events.requested.forEach(el => {console.log(el)})
// 	console.log("allEvents");
// 	console.log(allEvents);
	
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
    	<h1 style={{ textAlign:"center"}}>{"IITK Student's Gymkhana Event Calendar"}</h1>
    	<Dialog open={!!dialogOpen} 
    	onClose={closeDialog} fullWidth>
      	<Card name="add-event" ref={addEventFormRef} component={"form"} className="box" id="myform" sx={{width: "100%", display:"flex", flexDirection:"column", gap:"10px", overflow:"auto"}} onSubmit={async (e) => {
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
      		<div style={{display:"flex", width:"100%", gap: "10px"}}><TextField helperText="Date" name="date" type="date" defaultValue={dialogDate} onChange={(e) => {setDialogDate(e.target.value)}} sx={{flexGrow: "3"}} required/><TextField helperText="Start Time" name="start" type="time" defaultValue={dialogEdit.start} sx={{flexGrow: "2"}} required/><TextField helperText="End Time" name="end" type="time" defaultValue={dialogEdit.end} sx={{flexGrow: "2"}} required/></div>
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
      			<img src={!!imageFile ? imagePreview : imageURL} alt="Your uploaded image" className="box" style={{width:"100%"}}/>
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
      <Box sx={{width: "90%", margin:"auto"}}>
				<Grid spacing={2} container>
					<Grid item xs={12} md={9}>
					<Calendar className="box" allowAddEvent={user} events={allEvents} addEvent={addEvent} deleteEvent={deleteEvent} editEvent={editEvent} editEventApproval={editEventApproval} privilege={privileges} style={{width: "100%", margin:"auto", flexShrink: "0", padding:"0px"}}/>
					</Grid>
					<Grid item xs={12} md={3}>
						<Box className="box" sx={{width: "100%", backgroundColor:theme.primaryColor, color:theme.secondaryColor}}>
							<h1>Upcoming Events</h1>
							<ThemeProvider theme={theme}>
							{allEvents.filter(event => (event.date - Date.now() > 0) && (event.date - Date.now() < 1000*60*60*24*7)).map((event, idx) => (
							<Event event={event} index={idx} withDate canEdit={!!privileges[event.orgKey]} canApprove={privileges[event.orgKey] === "approve"} deleteEvent={deleteEvent} editEventApproval={editEventApproval} editEvent={editEvent} primaryColorRGB={theme.primaryColor} style={{width:"100%"}} />
							))}
							</ThemeProvider>
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
