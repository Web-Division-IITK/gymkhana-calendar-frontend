import React, { useState, useEffect, useRef } from "react";
import helperFunctions from "./helpers/functions";
import translations from "./helpers/translations";
import { CHEVRON_ICON_SVG, CLOCK_ICON_SVG, DETAILS_ICON_SVG, SIDEBAR_ICON_SVG, PEOPLE_ICON_SVG, VENUE_ICON_SVG } from "./helpers/consts";
import { ThemeProvider, useTheme } from "styled-components";
import { Calendar, CloseDetail, CloseSidebar, ChevronButton, Day, DayButton, Details, Event as EventDiv, Inner, MonthButton, Sidebar, MonthHeader, Button} from "./styles";

// -1 = animate closing | 0 = nothing | 1 = animate opening.
let animatingSidebar = 0;
let animatingDetail = 0;

//assumes events is sorted, please sort the prop in parent component!!!

export const Event = ({event, index, withDate, canEdit, canApprove, deleteEvent, editEventApproval, editEvent, style, lang = "en", detailDateFormat = "DD/MM/YYYY", animationSpeed = 300, languages = translations, timeFormat24 = true}) => {
	
	const [expanded, setExpanded] = useState(false);
	const divRef = useRef(null);
	const imgRef = useRef(null);
	//have to use a ref for the description div because
	//css doesn't have transitions for height:auto
	//so height needs to be manually set on expansion -_-
	
	const theme = useTheme();
	
	useEffect(() => {
		//attach onload handler to event image to make div taller when the image loads
		if (divRef.current) {
			let imgElement = divRef.current.querySelector("img");
			if (imgElement != null) {
				let imgHandler = () => {
					//v i.e. if the div isn't currently collapsed
					if (divRef.current.parentElement.style.height != "0px")
						divRef.current.parentElement.style.height = `${(divRef.current.scrollHeight + 5)}px`;
				}
				imgElement.addEventListener("load", imgHandler);
				return () => {imgElement.removeEventListener("load", imgHandler);}
			}
		}
	}, [divRef]);
	
	/*
	event properties:
	name
	date (unix timestamp -> includes start time as well)
	venue
	org (organisation, e.g. club, or council, or cell, etc.)
	duration
	x extra {
		icon
		text
	} x (removed)
	image (to add)
	desc (added)
	*/
	//delete button for "Are you sure? prompt"
	const DeleteButton = () => {
		const [clicked, setClicked] = useState(false);
		return (
			!clicked ? (
			<Button
			onClick={() => {setClicked(true);}}>{event.status === "requested" ? "Delete" : "Cancel"}</Button>
			) : (
				<div>
				Are you sure? {event.status === "approved" && "This will delete the event."}
				<Button onClick={() => {deleteEvent(event)}}>Yes</Button>
				<Button onClick={() => {setClicked(false);}}>No</Button>
				</div>
			)
		)
	}
	
	const DenyButton = () => {
		const [clicked, setClicked] = useState(false);
		return (
			!clicked ? (
			<Button
			onClick={() => {setClicked(true);}}>Deny</Button>
			) : (
				<div>
				Are you sure? This will delete the event.
				<Button onClick={() => {deleteEvent(event)}}>Yes</Button>
				<Button onClick={() => {setClicked(false);}}>No</Button>
				</div>
			)
		)
	}

	return (
		<EventDiv key={index} role="button" style={style}>
			{event.status === "requested" && <div>[Requested]</div>}
			{(canEdit || canApprove) && <div style={{gap:"5px", flexWrap:"wrap"}}>
			{canEdit && <><Button onClick={() => {editEvent(event)}}>Edit</Button><DeleteButton /></>}
			{canApprove && event.status === "requested" && <><Button onClick={() => {editEventApproval(event)}}>Approve</Button><DenyButton /></>}
			{canApprove && event.status === "approved" && <><Button onClick={() => {editEventApproval(event)}}>Rescind Approval</Button></>}
			</div>}
			
			<div style={{justifyContent:"space-between"}}>
				<ChevronButton
				angle={expanded ? 180 : 0}
				action={() => {
					setExpanded(!expanded);
				}} style={{width:"100%", alignItems:"center"}}><h2 style={{width:"80%", textAlign:"left", whiteSpace:"nowrap", overflowX:"auto", margin:"0"}}>{event.name}</h2></ChevronButton>
			</div>
			{withDate && (
			<div>
				<svg width="20" height="20" viewBox="0 0 24 24">
					<path fill={theme.primaryColor} d={SIDEBAR_ICON_SVG}/>
				</svg>
				<span>{helperFunctions.getFormattedDate(new Date(event.date), detailDateFormat, lang, languages)}</span>
			</div>)}
			<div>
					<svg width="20" height="20" viewBox="0 0 24 24">
						<path fill={theme.primaryColor} d={CLOCK_ICON_SVG}/>
					</svg>
					<span>{helperFunctions.getFormattedTime(new Date(event.date), timeFormat24)} to {helperFunctions.getFormattedTime(new Date(event.date + event.duration*60*1000), timeFormat24)}</span>
			</div>
			<div>
					<svg width="20" height="20" viewBox="0 0 24 24">
						<path fill={theme.primaryColor} d={PEOPLE_ICON_SVG}/>
					</svg>
					<span>{event.org}</span>
			</div>
			<div>
					<svg width="20" height="20" viewBox="0 0 24 24">
						<path fill={theme.primaryColor} d={VENUE_ICON_SVG}/>
					</svg>
					<span>{event.venue}</span>
			</div>
			<div
			style={{
				height:`${expanded ? (divRef.current.scrollHeight + 5) + "px" : "0px"}`,
				transition: `height ${animationSpeed}ms ease`,
				overflow:"hidden",
			}}>
				<div style={{display:"block"}} ref={divRef}>
				{event.image != "" && <img className="box" ref={imgRef} style={{width:"100%"}} src={event.image} alt="Event poster"/>}
				{event.desc}								
				</div>
				
			</div>
		</EventDiv>
	)
}

		/***********************
     * CALENDAR COMPONENTS *
     ***********************/

function CalendarDetails({currentYear, currentMonth, currentDay, detailsOpen, setDetailsState, onePanelAtATime, sidebarOpen, setSidebarState, events, privilege, deleteEvent, editEventApproval, editEvent, addEvent, primaryColorRGB, floatingPanels, detailDateFormat, lang, languages, allowAddEvent, secondaryColorRGB, showDetailToggler}) {
	var selectedDate = new Date(currentYear, currentMonth, currentDay);
	
	// Make sure no animation will run on next re-render.
	function animationEnd() {
			animatingDetail = 0;
	}
	
	function toggleDetails() {
			animatingDetail = detailsOpen ? -1 : 1;
			setDetailsState(detOpen => (detOpen ? false : "day"));
			// Force sidebar to close if onepanelatatime is true.
			if (animatingDetail === 1 && onePanelAtATime && sidebarOpen) {
					animatingSidebar = -1;
					setSidebarState(false);
			}
	}
	
//         console.log(events);
	const eventDivs = [];
	for (let index = 0; index < events.length; index++) {
			var eventDate = new Date(events[index].date);
			// Take out time from passed timestamp in order to compare only date
			var tempDate = new Date(events[index].date);
			var event = events[index]
			tempDate.setHours(0, 0, 0, 0);
			if (detailsOpen === "day") {
				if (helperFunctions.isValidDate(eventDate) && tempDate.getTime() === selectedDate.getTime()) {
						const eventdiv = (
						<Event index={index} event={events[index]} canEdit={!!privilege[event.orgKey]} canApprove={privilege[event.orgKey] === "approve"} deleteEvent={deleteEvent} editEventApproval={editEventApproval} editEvent={editEvent} primaryColorRGB={primaryColorRGB}/>
						);
						eventDivs.push(eventdiv);
				}
			} else if (detailsOpen === "month") {
				if (helperFunctions.isValidDate(eventDate) && tempDate.getMonth() === selectedDate.getMonth() && tempDate.getYear() === selectedDate.getYear()) {
						const eventdiv = (
						<Event index={index} event={events[index]} withDate canEdit={!!privilege[event.orgKey]} canApprove={privilege[event.orgKey] === "approve"} deleteEvent={deleteEvent} editEventApproval={editEventApproval} editEvent={editEvent} primaryColorRGB={primaryColorRGB}/>
						);
						eventDivs.push(eventdiv);
				}
			}
	}
//         console.log(eventDivs);
	// For no-event days add no events text
	// if (eventDivs.length === 0) {
//         	if (detailsOpen == "day") eventDivs.push(<p key={-1}>{languages[lang].noEventForThisDay}</p>);
//         	else if (detailsOpen == "month") eventDivs.push(<p key={-1}>{"No event for this month..."}</p>);
//         }
	//No need for this now because number of events indicator
	return (<>
	<Details $animatingIn={animatingDetail === 1} $animatingOut={animatingDetail === -1} $detailsOpen={detailsOpen} $floatingPanels={floatingPanels} onAnimationEnd={animationEnd}>
		<div>
			{detailsOpen === "day" && helperFunctions.getFormattedDate(selectedDate, detailDateFormat, lang, languages)}
			{detailsOpen === "month" && `${languages[lang].months[currentMonth]} ${currentYear}`}
			{allowAddEvent && (<Button onClick={() => addEvent(new Date(currentYear, currentMonth, currentDay))}>
					<h3>{languages[lang].addEvent}</h3>
				</Button>)}
		</div>
		<div>
			<p>{`${eventDivs.length} ${eventDivs.length === 1 ? "event" : "events"}`}</p>
			{eventDivs.map((event) => {
					return event;
			})}
		</div>
	</Details>
	{showDetailToggler && (<CloseDetail onClick={toggleDetails} $animatingIn={animatingDetail === 1} $animatingOut={animatingDetail === -1} $detailsOpen={detailsOpen} aria-label={languages[lang].toggleDetails}>
			<svg width="24" height="24" viewBox="0 0 24 24">
				<path fill={secondaryColorRGB} d={DETAILS_ICON_SVG}/>
			</svg>
		</CloseDetail>)}
</>);
}

function CalendarSidebar({currentYear, currentMonth, setYear, setMonth, sidebarOpen, setSidebarState, onePanelAtATime, detailsOpen, setDetailsState, lang, languages, showSidebarToggler, secondaryColorRGB}) {

		function prevYear() {
				setYear(currentYear - 1);
		}
		
		function nextYear() {
				setYear(currentYear + 1);
		}
		
		// Make sure no animation will run on next re-render.
		function animationEnd() {
				animatingSidebar = 0;
		}
		
		function toggleSidebar() {
				animatingSidebar = sidebarOpen ? -1 : 1;
				setSidebarState(!sidebarOpen);
				// Force details to close if onepanelatatime is true.
				if (animatingSidebar === 1 && onePanelAtATime && detailsOpen) {
						animatingDetail = -1;
						setDetailsState(false);
				}
		}
		
		return (<>
		<Sidebar $animatingIn={animatingSidebar === 1} $animatingOut={animatingSidebar === -1} $sidebarOpen={sidebarOpen} onAnimationEnd={animationEnd}>
			<div>
				<ChevronButton angle={90} primaryColorScheme={false} action={prevYear} ariaLabel={languages[lang].previousYear}/>
				<span>{currentYear}</span>
				<ChevronButton angle={270} primaryColorScheme={false} action={nextYear} ariaLabel={languages[lang].nextYear}/>
			</div>
			<div>
				<ul>
					{languages[lang].months.map((month, i) => {
						return (<li key={i}>
								<MonthButton $current={i === currentMonth} onClick={() => setMonth(i)}>
									{month}
								</MonthButton>
							</li>);
				})}
				</ul>
			</div>
		</Sidebar>
		{showSidebarToggler && (<CloseSidebar onClick={toggleSidebar} $animatingIn={animatingSidebar === 1} $animatingOut={animatingSidebar === -1} $sidebarOpen={sidebarOpen} aria-label={languages[lang].toggleSidebar}>
				<svg width="24" height="24" viewBox="0 0 24 24">
					<path fill={secondaryColorRGB} d={SIDEBAR_ICON_SVG}/>
				</svg>
			</CloseSidebar>)}
	</>);
}

function CalendarInner({currentYear, currentMonth, currentDay, setYear, setMonth, setDay, events, detailsOpen, setDetailsState, onePanelAtATime, sidebarOpen, setSidebarState, floatingPanels, openDetailsOnDateSelection, languages, lang, highlightToday}) {
	// Get list of days on each month accounting for leap years.
	const daysInMonths = helperFunctions.isLeapYear(currentYear);
	const days = [];
	
	for (let index = 1; index <= daysInMonths[currentMonth]; index++) {
			var isToday = helperFunctions.isToday(index, currentMonth, currentYear);
			var highlight = isToday && highlightToday;
			// var hasEvent = false;
			let numApprovedEvents = 0;
			let numRequestedEvents = 0;
			for (let indexEvent = 0; indexEvent < events.length; indexEvent++) {
					const currentDate = new Date(currentYear, currentMonth, index);
					// Take out time from passed timestamp in order to compare only date
					var tempDate = new Date(events[indexEvent].date);
					tempDate.setHours(0, 0, 0, 0);
					if (tempDate.getTime() === currentDate.getTime()) {
						if (events[indexEvent].status === "approved") numApprovedEvents++;
						if (events[indexEvent].status === "requested") numRequestedEvents++;
					}
			}
			const day = (
			<DayButton $today={highlight} $current={index === currentDay && detailsOpen === "day"} $numApprovedEvents={numApprovedEvents} $numRequestedEvents={numRequestedEvents} onClick={() => {
					setDay(index);
					if (openDetailsOnDateSelection && !detailsOpen) {
							animatingDetail = 1;
							setDetailsState("day");
							// Force sidebar to close if onepanelatatime is true.
							if (onePanelAtATime && sidebarOpen) {
									animatingSidebar = -1;
									setSidebarState(false);
							}
					} else if (detailsOpen === "month") {
						setDetailsState("day");
					}
			}}>
				<span style={{marginTop:"clamp(32px, max(1rem, 5vw), 55px)"}}>{index}</span>
			</DayButton>);
			days.push(day);
	}
	
	return (
	<Inner onClick={() => {
		if (floatingPanels) {
			if (sidebarOpen) {
					animatingSidebar = -1;
					setSidebarState(false);
			}
			else if (detailsOpen) {
					animatingDetail = -1;
					setDetailsState(false);
			}
		}
	}}>
	<div style={{display:"flex", justifyContent:"center", alignItems:"center", margin:"auto", width:"250px"}}>
	<ChevronButton angle={90} primaryColorScheme={true} ariaLabel={languages[lang].previousYear} 
	action={() => {
		if (currentMonth == 0) {
			setYear(currentYear - 1);
			setMonth(11);
		} else setMonth(currentMonth - 1);
	}}
	/>
	<MonthHeader $current={detailsOpen === "month"} onClick={() => {
		//open details view to month to see events of month
		//no need to set month because it is already current month
		if (openDetailsOnDateSelection && !detailsOpen) {
			animatingDetail = 1;
			setDetailsState("month");
			// Force sidebar to close if onepanelatatime is true.
			if (onePanelAtATime && sidebarOpen) {
				animatingSidebar = -1;
				setSidebarState(false);
			}
		} else if (detailsOpen) {
			setDetailsState("month")
		}
	}}>{languages[lang].months[currentMonth]}</MonthHeader>
	<ChevronButton angle={270} primaryColorScheme={true} ariaLabel={languages[lang].previousYear} 
	action={() => {
		if (currentMonth == 11) {
			setYear(currentYear + 1);
			setMonth(0);
		} else setMonth(currentMonth + 1);
	}}
	/>
	</div>
	<div>
		<div>
			{languages[lang].daysShort.map((weekDay) => {
				return <div key={weekDay}>{weekDay.toUpperCase()}</div>;
			})}
		</div>
		<div>
			{days.map((day, i) => {
				return (<Day $firstDay={i === 0} key={i} $firstOfMonth={helperFunctions.getFirstWeekDayOfMonth(currentMonth, currentYear) + 1}>
					{day}
				</Day>);
			})}
		</div>
	</div>
</Inner>);
}

const RevoCalendar = ({
	style = {},
	className = "",
	events = [],
	privilege = {},
	highlightToday = true,
	lang = "en",
// 	primaryColor = "#333",
// 	secondaryColor = "#fff",
// 	todayColor = "#3B3966",
// 	textColor = "#f00",
// 	indicatorColor = "orange",
// 	otherIndicatorColor = "#08e",
	animationSpeed = 300,
	sidebarWidth = 180,
	detailWidth = 360,
	detailWidthFraction = 0.6, 
	//overrides detailWidth, effectively the same as putting detailWidth = 40%
	showDetailToggler = true,
	detailDefault = "day",
	showSidebarToggler = true,
	sidebarDefault = true,
	onePanelAtATime = false,
	allowDeleteEvent = false,
	allowAddEvent = false,
	openDetailsOnDateSelection = true,
	timeFormat24 = true,
	showAllDayLabel = false,
	detailDateFormat = "DD/MM/YYYY",
	languages = translations,
	date = new Date(),
	dateSelected = () => { },
	eventSelected = () => { },
	addEvent = () => { },
	deleteEvent = () => { },
	editEvent = () => { },
	editEventApproval = () => { },
}) => {
		
		const theme = useTheme();

    // Transform any passed color format into rgb.
    const primaryColorRGB = helperFunctions.getRGBColor(theme.primaryColor);
    const secondaryColorRGB = helperFunctions.getRGBColor(theme.secondaryColor);
    const todayColorRGB = helperFunctions.getRGBColor(theme.todayColor);
    const indicatorColorRGB = helperFunctions.getRGBColor(theme.indicatorColor);
    const otherIndicatorColorRGB = helperFunctions.getRGBColor(theme.otherIndicatorColor);
    const textColorRGB = helperFunctions.getRGBColor(theme.textColor);
    const calendarRef = useRef(null);
    
    // Get calendar size hook.
    function useCalendarWidth() {
        const [size, setSize] = useState(0);
        useEffect(() => {
            function updateSize() {
                if (calendarRef.current != null) {
                    setSize(calendarRef.current.offsetWidth);
                }
            }
            if (typeof window !== "undefined")
                window.addEventListener("resize", updateSize);
            updateSize();
            return () => window.removeEventListener("resize", updateSize);
        }, [calendarRef.current]);
        return size;
    }
    
    const calendarWidth = useCalendarWidth();
    if (detailWidthFraction) detailWidth = calendarWidth*detailWidthFraction;
    
    // If calendar width can't fit both panels, force one panel at a time.
    if (calendarWidth <= 320 + sidebarWidth + detailWidth) {
        onePanelAtATime = true;
        // If both sidebar and detail panels are set to be open by default, sidebar will have priority.
        if (sidebarDefault && detailDefault)
            detailDefault = false;
    }
    
    // In order to make it responsible, panels will float on top of calendar on low res.
    const floatingPanels = calendarWidth <= 320 + sidebarWidth || calendarWidth <= 320 + detailWidth;
    // If, with the current setting, the sidebar or detail panels won't fit the screen, make them smaller.
    sidebarWidth = calendarWidth < sidebarWidth + 50 ? calendarWidth - 50 : sidebarWidth;
    detailWidth = calendarWidth < detailWidth + 50 ? calendarWidth - 50 : detailWidth;
    
    // Use today as default selected date if passed date is invalid.
    if (!helperFunctions.isValidDate(date)) {
        console.log("The passed date prop is invalid");
        date = new Date();
    }
    
    // Set initial state.
    const [currentDay, setDay] = useState(date.getDate());
    const [currentMonth, setMonth] = useState(date.getMonth());
    const [currentYear, setYear] = useState(date.getFullYear());
    const [sidebarOpen, setSidebarState] = useState(sidebarDefault);
    const [detailsOpen, setDetailsState] = useState(detailDefault);
    // Give parent component the current selected calendar day.
    useEffect(() => {
        dateSelected({
            day: currentDay,
            month: currentMonth,
            year: currentYear,
        });
    }, [currentDay, currentMonth, currentYear]);
    
    // Close details if can't fit it anymore after resizing.
    useEffect(() => {
        if (sidebarOpen && detailsOpen && calendarWidth <= 320 + sidebarWidth + detailWidth) {
            animatingDetail = -1;
            setDetailsState(false);
        }
    }, [calendarWidth]);
    
    

		const props = {
			style,
			className,
			events,
			privilege,
			highlightToday,
			lang,
			animationSpeed,
			sidebarWidth,
			detailWidth,
			detailWidthFraction,
			showDetailToggler,
			detailDefault,
			showSidebarToggler,
			sidebarDefault,
			onePanelAtATime,
			allowDeleteEvent,
			allowAddEvent,
			openDetailsOnDateSelection,
			timeFormat24,
			showAllDayLabel,
			detailDateFormat,
			languages,
			date,
			dateSelected,
			eventSelected,
			addEvent,
			deleteEvent,
			editEvent,
			editEventApproval,
			primaryColorRGB,
			secondaryColorRGB,
			todayColorRGB,
			indicatorColorRGB,
			otherIndicatorColorRGB,
			textColorRGB,
		} // last thing before rendering so that any changes made to values are reflected in props
		
		// /r/makemesuffer 
		
		// console.log(props);
		
    /**************************
     * RENDER ACTUAL CALENDAR *
     **************************/
    return (<ThemeProvider theme={{
            // primaryColor: primaryColorRGB,
//             primaryColor50: helperFunctions.getRGBAColorWithAlpha(primaryColorRGB, 0.5),
//             secondaryColor: secondaryColorRGB,
//             todayColor: todayColorRGB,
//             textColor: textColorRGB,
//             indicatorColor: indicatorColorRGB,
//             otherIndicatorColor: otherIndicatorColorRGB,
//             animationSpeed: `${animationSpeed}ms`,
//moved to App.js
            sidebarWidth: `${sidebarWidth}px`,
            detailWidth: `${detailWidth}px`,
        }}>
      <Calendar className={className} ref={calendarRef} style={style}>
        <CalendarSidebar {...{currentYear, currentMonth, setYear, setMonth, sidebarOpen, setSidebarState, onePanelAtATime, detailsOpen, setDetailsState, lang, languages, showSidebarToggler, secondaryColorRGB}}/>
        <CalendarInner {...{currentYear, currentMonth, currentDay, setYear, setMonth, setDay, events, detailsOpen, setDetailsState, onePanelAtATime, sidebarOpen, setSidebarState, floatingPanels, openDetailsOnDateSelection, languages, lang, highlightToday}}/>
        <CalendarDetails {...props} {...theme} currentYear={currentYear} currentMonth={currentMonth} currentDay={currentDay} detailsOpen={detailsOpen} setDetailsState={setDetailsState} sidebarOpen={sidebarOpen} setSidebarState={setSidebarState} floatingPanels={floatingPanels}/>
      </Calendar>
    </ThemeProvider>);
};
export default RevoCalendar;