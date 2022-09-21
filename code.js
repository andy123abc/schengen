//Schengen Calculator by Andy Cotter
//Use or change as needed
//Known issue: Due to how javascript handles dates, certian time in some timezones may cause trouble

angular.module('schengenCalcApp', [])
    .controller('schengenCalcController', function () {
        var calc = this;

        //Setup variables
        const _MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
        calc.tripList = [];
        calc.dateList = [];
        calc.errorAddTripMessage = "";

        //Check if new trip can be added (return boolean)
        calc.canAddTrip = function (arrival, departure, list) {
            addTripError(""); //reset error message

            //Check if there are values in arrival and departure
            if (arrival === undefined || arrival === null ||
                departure === undefined || departure === null) return false;

            //Check if arrival is after departure (can't happen unless time machine)
            if (arrival > departure) {
                addTripError("Departure date cannot be before Arrival date");
                return false;
            }

            //Check if current dates intersect with another trip
            for (var i = 0; i < calc.tripList.length; i++) {
                if (
                    (arrival <= list[i].arrival && list[i].arrival <= departure) ||
                    (arrival <= list[i].departure && list[i].departure <= departure) ||
                    (list[i].arrival < arrival && departure < list[i].departure)) {
                    addTripError("Trip cannot intersect another trip");
                    return false;
                }
            };

            return true; //no issues can add trip
        };

        //Handles the add trip error message
        function addTripError(message) {
            calc.errorAddTripMessage = message;
        }

        //Reset New Trip Variables
        function resetNewTripVariables() {
            calc.newArrival = undefined;
            calc.newDeparture = undefined;
            calc.newTripName = undefined;
        }

        //Add new trip
        calc.addTrip = function (tripName, arrival, departure) {
            calc.tripList.push({ tripName: tripName, arrival: arrival, departure: departure, valid: true, days: 0 });
            resetNewTripVariables();
            calculate();
        };

        //Remove trip from list
        calc.removeTrip = function (arrival) {
            calc.tripList = calc.tripList.filter(function (trip) {
                return trip.arrival !== arrival;
            });
            calculate();
        };

        //Remove all trips (reset)
        calc.removeAll = function () {
            calc.tripList = [];
            calculate();
        };

        //Calculate Helpers
        function addDays(date, days) {
            var result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        }

        function addToDateList(dateToAdd, tripName, isInSchengen) {
            tripName = (isInSchengen ? tripName : "(Not Schengen)");
            let balance = 1; //default for the first record to add 
            if (calc.dateList.length === 0) {
                balance = 1; //The program starts with the first trip in the Schgengen so will start balance right at 1
            } else {
                //Get the balance from the previous record and if in Schengen add 1 
                balance = calc.dateList[calc.dateList.length - 1].balance + (isInSchengen ? 1 : 0);
                //Need go back 180 days and see if a day should be removed from the balance
                if (calc.dateList.length >= 180) {
                    balance -= (calc.dateList[calc.dateList.length - 180].isInSchengen ? 1 : 0);
                }
            }
            calc.dateList.push({
                date: dateToAdd,
                tripName: tripName,
                isInSchengen: isInSchengen,
                balance: balance,
                date180Future: addDays(dateToAdd, 180),
                date180Past: addDays(dateToAdd, -180)
            });
        }

        //Calculate dates, this is run every time a change is made to the list
        //Assumption1: The trips don't have any date issues (no intersections, no bad dates, no depeture before arrival)
        //Assumption2: The trips are in order by date  (setup a sorting routine so wouldn't have this assumption)
        function calculate() {
            const FUTURE_END_DATE = 181; //how many days to go into the future
            calc.dateList = []; //reset the date list 
            let currentDate = undefined; //The current date that is processed
            let endDate = undefined; //The last date for the date list (final date + 180 days)
            angular.forEach(calc.tripList, function (trip) {
                //calculate the number of days in each trip
                trip.days = Math.trunc((trip.departure - trip.arrival) / _MILLISECONDS_PER_DAY) + 1;

                //Check if at the beginning 
                if (currentDate === undefined) {
                    currentDate = trip.arrival;
                    endDate = addDays(trip.departure, FUTURE_END_DATE);
                } else {
                    //Since there can be no overlap (by definition), need to fill in the gap
                    while (currentDate < trip.arrival) {
                        addToDateList(currentDate, null, false);
                        currentDate = addDays(currentDate, 1);
                    }
                    endDate = addDays(trip.departure, FUTURE_END_DATE);
                }

                //Go through add days of the trip
                for (i = 0; i < trip.days; i++) {
                    addToDateList(currentDate, trip.tripName, true);
                    currentDate = addDays(currentDate, 1);
                }
            });
            //Go 180 days past the end to get the available days to zero 
            while (currentDate < endDate) {
                addToDateList(currentDate, null, false);
                currentDate = addDays(currentDate, 1);
            }
        }

        //Initialize and config
        initialize();
        function initialize() {

            //setting trips for testing (todo:remove for production)
            //Basic test
            //calc.addTrip('test', new Date('9/1/2022'), new Date('9/10/2022'));
            //Test two trips
            //calc.addTrip('Quick trip', new Date('9/1/2022'), new Date('9/2/2022'));
            //calc.addTrip('Oktoberfest', new Date('10/1/2022'), new Date('10/31/2022'));
            //Test One long trip
            //calc.addTrip('Quick trip', new Date('1/1/2022'), new Date('4/1/2022'));
            //Complex coming and going (the final test)
            calc.addTrip('Spain', new Date('11/08/2021'), new Date('12/1/2021'));
            calc.addTrip('Portugal', new Date('1/31/2022'), new Date('3/30/2022'));
            calc.addTrip('Italy', new Date('6/12/2022'), new Date('6/20/2022'));
            calc.addTrip('Eastern Europe', new Date('7/16/2022'), new Date('9/29/2022'));
            calc.addTrip('Iceland', new Date('12/08/2022'), new Date('12/21/2022'));
            calculate();
        }
    });