import {useState} from "react";
// import logo from './logo.svg';
// import './App.css';
import Calendar from "./revo-calendar"

function App() {
	const [events, setEvents] = useState([])
	
	const addEvent = (date) => {
		console.log("Event being added")
		console.log(date)
		setEvents([...events, {
			name: "New Event",
			date: date.getTime()
		}])
	}
	
	const deleteEvent = (idx) => {
	
	}

  return (
    <>
    	<h1>Gymkhana Calendar</h1>
      <Calendar allowAddEvent events={events} addEvent={addEvent} style={{width: "75%", margin:"auto", border:"1px solid #000", borderRadius:"5px"}}/>
    </>
  );
}

export default App;
