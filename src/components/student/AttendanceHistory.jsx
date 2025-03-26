// import React, { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
// import { 
//   Calendar as CalendarIcon, 
//   CheckCircle, 
//   XCircle, 
//   BarChart2,
//   Clock,
//   MapPin,
//   Calendar as CalendarLucide
// } from 'lucide-react';
// import { Line } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend
// } from 'chart.js';
// import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
// import { db } from '../../firebase/config';
// import { collection, query, where, getDocs } from 'firebase/firestore';
// import { toast } from 'react-toastify';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend
// );

// const AttendanceHistory = () => {
//   const { studentId } = useParams();
//   const [attendanceData, setAttendanceData] = useState([]);
//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const [loading, setLoading] = useState(true);
//   const [monthlyStats, setMonthlyStats] = useState(null);

//   useEffect(() => {
//     const fetchAttendanceHistory = async () => {
//       try {
//         if (!studentId) {
//           toast.error('No student ID provided');
//           setLoading(false);
//           return;
//         }

//         // console.log('Fetching attendance for studentId:', studentId);
//         const attendanceRef = collection(db, 'attendance');
//         const q = query(attendanceRef, where('studentId', '==', studentId));
        
//         const querySnapshot = await getDocs(q);
//         const records = querySnapshot.docs.map(doc => ({
//           id: doc.id,
//           ...doc.data(),
//           date: new Date(doc.data().date)
//         })).sort((a, b) => b.date - a.date);

//         // console.log('Fetched attendance records:', records);
//         setAttendanceData([...records]); // Ensure a new array for state update
//         // console.log('State set with attendanceData:', records);
//         calculateMonthlyStats(records);
//       } catch (error) {
//         // console.error('Error fetching attendance:', error);
//         toast.error('Error loading attendance history. Please try again later.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAttendanceHistory();
//   }, [studentId]);

//   const calculateMonthlyStats = (records) => {
//     // console.log('Calculating stats with records:', records);
//     const start = startOfMonth(selectedDate);
//     const end = endOfMonth(selectedDate);
//     const days = eachDayOfInterval({ start, end });

//     const monthlyData = days.map(day => {
//       const record = records.find(r => 
//         format(r.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
//       );
//       return {
//         date: format(day, 'dd'),
//         present: record?.status === 'present' ? 1 : 0
//       };
//     });

//     // console.log('Monthly data calculated:', monthlyData);
//     const stats = {
//       labels: monthlyData.map(d => d.date),
//       datasets: [
//         {
//           label: 'Attendance',
//           data: monthlyData.map(d => d.present),
//           borderColor: 'rgb(75, 192, 192)',
//           tension: 0.1,
//           fill: false
//         }
//       ]
//     };
//     setMonthlyStats(stats);
//     // console.log('Monthly stats set:', stats);
//   };

//   const getAttendanceForDate = (date) => {
//     const record = attendanceData.find(record => 
//       format(record.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
//     );
//     // console.log('Selected date:', format(date, 'yyyy-MM-dd'), 'Found record:', record);
//     return record;
//   };

//   const stats = {
//     total: attendanceData.length,
//     present: attendanceData.filter(record => record.status === 'present').length,
//     absent: attendanceData.filter(record => record.status === 'absent').length,
//     percentage: attendanceData.length > 0
//       ? Math.round((attendanceData.filter(record => record.status === 'present').length / attendanceData.length) * 100)
//       : 0,
//     streak: calculateStreak(attendanceData)
//   };

//   function calculateStreak(records) {
//     let currentStreak = 0;
//     const sortedRecords = [...records].sort((a, b) => b.date - a.date);
//     for (const record of sortedRecords) {
//       if (record.status === 'present') {
//         currentStreak++;
//       } else {
//         break;
//       }
//     }
//     return currentStreak;
//   }

//   // console.log('Rendering with attendanceData:', attendanceData, 'monthlyStats:', monthlyStats);

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-[60vh]">
//         <div className="spinner-border text-primary-600" role="status">
//           <span className="sr-only">Loading...</span>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto px-4 py-8">
//       <div className="flex justify-between items-center mb-8">
//         <h2 className="text-2xl font-bold flex items-center text-gray-800">
//           <CalendarLucide size={24} className="mr-2 text-primary-600" />
//           Attendance History
//         </h2>
//         <div className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center">
//           <Clock size={16} className="mr-2" />
//           Current Streak: {stats.streak} days
//         </div>
//       </div>
      
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <div className="flex items-center">
//             <div className="bg-primary-100 p-3 rounded-full">
//               <CalendarIcon className="text-primary-600 h-6 w-6" />
//             </div>
//             <div className="ml-4">
//               <p className="text-sm text-gray-500">Total Classes</p>
//               <h3 className="text-2xl font-bold">{stats.total}</h3>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <div className="flex items-center">
//             <div className="bg-green-100 p-3 rounded-full">
//               <CheckCircle className="text-green-600 h-6 w-6" />
//             </div>
//             <div className="ml-4">
//               <p className="text-sm text-gray-500">Present</p>
//               <h3 className="text-2xl font-bold">{stats.present}</h3>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <div className="flex items-center">
//             <div className="bg-red-100 p-3 rounded-full">
//               <XCircle className="text-red-600 h-6 w-6" />
//             </div>
//             <div className="ml-4">
//               <p className="text-sm text-gray-500">Absent</p>
//               <h3 className="text-2xl font-bold">{stats.absent}</h3>
//             </div>
//           </div>
//         </div>
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <div className="flex items-center">
//             <div className="bg-blue-100 p-3 rounded-full">
//               <BarChart2 className="text-blue-600 h-6 w-6" />
//             </div>
//             <div className="ml-4">
//               <p className="text-sm text-gray-500">Attendance %</p>
//               <h3 className="text-2xl font-bold">{stats.percentage}%</h3>
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         <div className="lg:col-span-2">
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h3 className="text-xl font-semibold mb-6">Monthly Trend</h3>
//             {monthlyStats ? (
//               <Line
//                 data={monthlyStats}
//                 options={{
//                   responsive: true,
//                   plugins: {
//                     legend: { position: 'top' },
//                     title: {
//                       display: true,
//                       text: format(selectedDate, 'MMMM yyyy')
//                     }
//                   },
//                   scales: {
//                     y: {
//                       beginAtZero: true,
//                       max: 1,
//                       ticks: {
//                         stepSize: 1,
//                         callback: value => value === 1 ? 'Present' : 'Absent'
//                       }
//                     }
//                   }
//                 }}
//               />
//             ) : (
//               <p className="text-gray-500 text-center">No attendance data available for this month</p>
//             )}
//           </div>
//         </div>
//         <div className="lg:col-span-1">
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h3 className="text-xl font-semibold mb-6">Daily Details</h3>
//             {getAttendanceForDate(selectedDate) ? (
//               <div className="space-y-4">
//                 <div>
//                   <p className="text-gray-600">Date:</p>
//                   <p className="font-semibold">{format(selectedDate, 'PPP')}</p>
//                 </div>
//                 <div>
//                   <p className="text-gray-600">Status:</p>
//                   <p className={`font-semibold flex items-center ${
//                     getAttendanceForDate(selectedDate).status === 'present' ? 'text-green-600' : 'text-red-600'
//                   }`}>
//                     {getAttendanceForDate(selectedDate).status === 'present' ? (
//                       <>
//                         <CheckCircle size={16} className="mr-2" />
//                         Present
//                       </>
//                     ) : (
//                       <>
//                         <XCircle size={16} className="mr-2" />
//                         Absent
//                       </>
//                     )}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-gray-600">Batch:</p>
//                   <p className="font-semibold">{getAttendanceForDate(selectedDate).batchName}</p>
//                 </div>
//                 <div>
//                   <p className="text-gray-600 flex items-center">
//                     <MapPin size={16} className="mr-2" />
//                     Location:
//                   </p>
//                   <p className="font-semibold">
//                     {`${getAttendanceForDate(selectedDate).location.lat}, ${getAttendanceForDate(selectedDate).location.lng}`}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-gray-600">Time:</p>
//                   <p className="font-semibold">
//                     {format(getAttendanceForDate(selectedDate).date, 'p')}
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               <div className="text-gray-500 text-center py-4">
//                 No attendance record for {format(selectedDate, 'PPP')}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AttendanceHistory;