import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
* AvailabilitySetup - Configure freelancer availability schedule
* Set weekly hours and availability slots
*/
export function AvailabilitySetup({ freelancerId }) {
 const { user } = useAuth();
 const [slots, setSlots] = useState([
   { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00', hoursAvailable: 8 },
   { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '17:00', hoursAvailable: 8 },
   { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '17:00', hoursAvailable: 8 },
   { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '17:00', hoursAvailable: 8 },
   { dayOfWeek: 'Friday', startTime: '09:00', endTime: '17:00', hoursAvailable: 8 },
   { dayOfWeek: 'Saturday', startTime: '', endTime: '', hoursAvailable: 0 },
   { dayOfWeek: 'Sunday', startTime: '', endTime: '', hoursAvailable: 0 },
 ]);
 const [timezone, setTimezone] = useState('UTC');
 const [totalHours, setTotalHours] = useState(40);
 const [loading, setLoading] = useState(false);
 const [message, setMessage] = useState(null);
 const [bookingForm, setBookingForm] = useState({ startDate: '', endDate: '', hoursPerDay: 8, notes: '' });
 const [bookingLoading, setBookingLoading] = useState(false);
 const [bookingMessage, setBookingMessage] = useState(null);
 const [savedAvailability, setSavedAvailability] = useState(null);

 const calculateHours = (start, end) => {
   if (!start || !end) return 0;
   const [startH, startM] = start.split(':').map(Number);
   const [endH, endM] = end.split(':').map(Number);
   const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
   return Math.max(0, totalMinutes / 60);
 };

 const handleTimeChange = (dayIndex, field, value) => {
   const newSlots = [...slots];
   newSlots[dayIndex][field] = value;

   if (field === 'startTime' || field === 'endTime') {
     newSlots[dayIndex].hoursAvailable = calculateHours(newSlots[dayIndex].startTime, newSlots[dayIndex].endTime);
   }

   setSlots(newSlots);
   updateTotalHours(newSlots);
 };

 const updateTotalHours = (nextSlots) => {
   const total = nextSlots.reduce((sum, slot) => sum + (slot.hoursAvailable || 0), 0);
   setTotalHours(total);
 };

 const loadAvailability = async () => {
   if (!user?._id) return;
   try {
     const res = await api.get('/availability/me');
     const data = res.data?.data;
     if (!data) return;
     setSavedAvailability(data);
     if (data.availabilitySlots?.length) {
       setSlots(data.availabilitySlots.map((slot) => ({ ...slot, hoursAvailable: Number(slot.hoursAvailable || 0) })));
     }
     if (data.timezone) setTimezone(data.timezone);
     if (data.totalAvailableHours) setTotalHours(Number(data.totalAvailableHours));
   } catch (error) {
     console.warn('Unable to load availability', error);
   }
 };

 useEffect(() => {
   void loadAvailability();
 }, [user?._id]);

 const handleSave = async () => {
   try {
     setLoading(true);
     await api.post('/availability/setup', {
       availabilitySlots: slots.filter((s) => s.startTime && s.endTime),
       timezone,
       totalAvailableHours: totalHours,
     });

     setMessage({ type: 'success', text: 'Availability schedule saved successfully!' });
     setTimeout(() => setMessage(null), 3000);
     await loadAvailability();
   } catch (error) {
     setMessage({
       type: 'error',
       text: error.response?.data?.message || 'Failed to save availability',
     });
   } finally {
     setLoading(false);
   }
 };

 const handleBookingSubmit = async (event) => {
   event.preventDefault();
   try {
     setBookingLoading(true);
     setBookingMessage(null);
     const payload = {
       freelancerId: freelancerId || user?._id,
       startDate: bookingForm.startDate,
       endDate: bookingForm.endDate,
       hoursPerDay: Number(bookingForm.hoursPerDay || 8),
       notes: bookingForm.notes,
       autoSchedule: true,
       title: 'Scheduled session',
     };

     const res = await api.post('/availability/book', payload);
     setBookingMessage({ type: 'success', text: res.data?.message || 'Booking created successfully.' });
     setBookingForm({ startDate: '', endDate: '', hoursPerDay: 8, notes: '' });
     await loadAvailability();
   } catch (error) {
     setBookingMessage({ type: 'error', text: error.response?.data?.message || 'Unable to create booking.' });
   } finally {
     setBookingLoading(false);
   }
 };

 return (
   <div className="space-y-6 rounded-lg bg-white p-6 shadow-md max-w-4xl">
     <div>
       <h2 className="text-2xl font-bold text-gray-900">Availability Slots & Booking</h2>
       <p className="mt-2 text-sm text-gray-600">Set recurring weekly availability and let clients book the next open slot automatically.</p>
     </div>

     {message && (
       <div className={`rounded-lg border p-4 ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
         {message.text}
       </div>
     )}

     <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
       <div>
         <div className="mb-6">
           <label className="mb-2 block text-sm font-medium text-gray-700">Timezone</label>
           <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-48">
             <option>UTC</option>
             <option>EST</option>
             <option>CST</option>
             <option>MST</option>
             <option>PST</option>
             <option>IST</option>
             <option>GMT</option>
           </select>
         </div>

         <div className="mb-6">
           <h3 className="mb-4 text-lg font-semibold text-gray-900">Weekly Schedule</h3>
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead>
                 <tr className="border-b border-gray-200">
                   <th className="px-4 py-2 text-left font-semibold text-gray-700">Day</th>
                   <th className="px-4 py-2 text-left font-semibold text-gray-700">Start Time</th>
                   <th className="px-4 py-2 text-left font-semibold text-gray-700">End Time</th>
                   <th className="px-4 py-2 text-left font-semibold text-gray-700">Hours</th>
                 </tr>
               </thead>
               <tbody>
                 {slots.map((slot, index) => (
                   <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                     <td className="px-4 py-3 font-medium text-gray-900">{slot.dayOfWeek}</td>
                     <td className="px-4 py-3">
                       <input type="time" value={slot.startTime} onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                     </td>
                     <td className="px-4 py-3">
                       <input type="time" value={slot.endTime} onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                     </td>
                     <td className="px-4 py-3 font-semibold text-gray-900">{(slot.hoursAvailable || 0).toFixed(1)} hrs</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>

         <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
           <div className="flex items-center justify-between gap-4">
             <div>
               <p className="text-sm text-gray-600">Total Hours Per Week</p>
               <p className="text-3xl font-bold text-blue-600">{totalHours.toFixed(1)} hours</p>
             </div>
             <div className="text-right">
               <p className="text-sm text-gray-600">Status</p>
               <p className="text-lg font-semibold text-gray-900">{savedAvailability?.status || 'available'}</p>
             </div>
           </div>
         </div>
       </div>

       <div className="space-y-4">
         <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
           <h3 className="mb-3 text-lg font-semibold text-gray-900">Automatic Scheduling</h3>
           <p className="text-sm text-gray-600">The system uses your recurring weekly slots to find the next available window automatically when a booking is requested.</p>
         </div>

         {user?.role === 'client' && (
           <form onSubmit={handleBookingSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
             <h3 className="mb-3 text-lg font-semibold text-gray-900">Book This Freelancer</h3>
             <p className="mb-3 text-sm text-gray-600">Choose a preferred date range and the scheduler will place the booking in the next matching availability window.</p>
             {bookingMessage && (
               <div className={`mb-3 rounded-lg border p-3 ${bookingMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                 {bookingMessage.text}
               </div>
             )}
             <div className="space-y-3">
               <div>
                 <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                 <input type="date" required value={bookingForm.startDate} onChange={(e) => setBookingForm((prev) => ({ ...prev, startDate: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
               <div>
                 <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                 <input type="date" required value={bookingForm.endDate} onChange={(e) => setBookingForm((prev) => ({ ...prev, endDate: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
               <div>
                 <label className="mb-1 block text-sm font-medium text-gray-700">Hours Per Day</label>
                 <input type="number" min="1" value={bookingForm.hoursPerDay} onChange={(e) => setBookingForm((prev) => ({ ...prev, hoursPerDay: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
               <div>
                 <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                 <textarea value={bookingForm.notes} onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))} rows="3" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
               <button type="submit" disabled={bookingLoading} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400">
                 {bookingLoading ? 'Creating booking...' : 'Request Booking'}
               </button>
             </div>
           </form>
         )}
       </div>
     </div>

     <div className="flex gap-3">
       <button onClick={handleSave} disabled={loading} className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-400">
         {loading ? 'Saving...' : 'Save Schedule'}
       </button>
       <button className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition hover:bg-gray-50">Cancel</button>
     </div>

     <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
       <h4 className="mb-2 font-semibold text-gray-900">Pro Tips</h4>
       <ul className="space-y-1 text-sm text-gray-700">
         <li>• Set realistic working hours to improve client matching.</li>
         <li>• You can add holidays and unavailable dates later.</li>
         <li>• The scheduler automatically chooses the next open window.</li>
       </ul>
     </div>
   </div>
 );
}

export default AvailabilitySetup;
