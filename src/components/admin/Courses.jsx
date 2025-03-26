import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Doughnut, Bar } from 'react-chartjs-2';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  BookOpen,
  Users,
  Monitor,
  Building,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  UserCheck,
  Smartphone,
  MapPin,
  AlertTriangle,
  BarChart
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
import { format, parseISO, isToday } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale,
  BarElement
);

const Courses = () => {
  const { batches } = useSelector(state => state.batches);
  const { allRecords: attendanceRecords } = useSelector(state => state.attendance);
  const [courseStats, setCourseStats] = useState([]);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    onlineStudents: 0,
    offlineStudents: 0,
    totalAttendance: 0,
    onlinePresent: 0,
    onlineAbsent: 0,
    offlinePresent: 0,
    offlineAbsent: 0
  });

  useEffect(() => {
    if (batches.length > 0 && attendanceRecords.length > 0) {
      // Calculate overall stats first
      const overall = {
        totalStudents: batches.reduce((acc, batch) => acc + (batch.students?.length || 0), 0),
        onlineStudents: batches.reduce((acc, batch) => 
          acc + (batch.students?.filter(s => s.mode === 'online').length || 0), 0),
        offlineStudents: batches.reduce((acc, batch) => 
          acc + (batch.students?.filter(s => s.mode === 'offline').length || 0), 0),
        totalAttendance: attendanceRecords.length,
        onlinePresent: attendanceRecords.filter(r => r.status === 'present' && r.mode === 'online').length,
        onlineAbsent: attendanceRecords.filter(r => r.status === 'absent' && r.mode === 'online').length,
        offlinePresent: attendanceRecords.filter(r => r.status === 'present' && r.mode === 'offline').length,
        offlineAbsent: attendanceRecords.filter(r => r.status === 'absent' && r.mode === 'offline').length
      };
      setOverallStats(overall);

      const courseData = batches.reduce((acc, batch) => {
        if (!acc[batch.course]) {
          acc[batch.course] = {
            totalStudents: 0,
            onlineStudents: 0,
            offlineStudents: 0,
            batches: [],
            attendance: {
              present: 0,
              absent: 0,
              onlinePresent: 0,
              offlinePresent: 0,
              onlineAbsent: 0,
              offlineAbsent: 0,
              adminMarked: 0,
              deviceMarked: 0,
              locationVerified: 0
            }
          };
        }

        const batchStats = {
          id: batch.id,
          name: batch.name,
          students: batch.students?.length || 0,
          onlineStudents: batch.students?.filter(s => s.mode === 'online').length || 0,
          offlineStudents: batch.students?.filter(s => s.mode === 'offline').length || 0,
          startDate: batch.startDate,
          presentStudents: [],
          absentStudents: []
        };

        acc[batch.course].batches.push(batchStats);
        acc[batch.course].totalStudents += batchStats.students;
        acc[batch.course].onlineStudents += batchStats.onlineStudents;
        acc[batch.course].offlineStudents += batchStats.offlineStudents;

        const batchAttendance = attendanceRecords.filter(record => 
          record.batchId === batch.id &&
          format(new Date(record.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
        );
        
        batchAttendance.forEach(record => {
          if (record.status === 'present') {
            acc[batch.course].attendance.present++;
            if (record.mode === 'online') {
              acc[batch.course].attendance.onlinePresent++;
            } else {
              acc[batch.course].attendance.offlinePresent++;
            }
          } else {
            acc[batch.course].attendance.absent++;
            if (record.mode === 'online') {
              acc[batch.course].attendance.onlineAbsent++;
            } else {
              acc[batch.course].attendance.offlineAbsent++;
            }
          }

          if (record.markedByAdmin) {
            acc[batch.course].attendance.adminMarked++;
          } else {
            acc[batch.course].attendance.deviceMarked++;
          }

          if (record.location && record.location.lat && record.location.lng) {
            acc[batch.course].attendance.locationVerified++;
          }
        });

        const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
        const batchAttendanceForDate = batchAttendance
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        const studentStatusMap = new Map();
        batchAttendanceForDate.forEach(record => {
          if (!studentStatusMap.has(record.studentId)) {
            studentStatusMap.set(record.studentId, {
              name: record.studentName,
              mode: record.mode,
              date: record.date,
              status: record.status,
              markedByAdmin: record.markedByAdmin || false,
              location: record.location,
              deviceId: record.deviceId
            });
          }
        });

        const batchIndex = acc[batch.course].batches.findIndex(b => b.id === batch.id);
        studentStatusMap.forEach((data, studentId) => {
          const attendanceInfo = {
            ...data,
            id: studentId,
            time: format(new Date(data.date), 'HH:mm:ss')
          };

          if (data.status === 'present') {
            acc[batch.course].batches[batchIndex].presentStudents.push(attendanceInfo);
          } else {
            acc[batch.course].batches[batchIndex].absentStudents.push(attendanceInfo);
          }
        });

        return acc;
      }, {});

      setCourseStats(Object.entries(courseData).map(([course, data]) => ({
        course,
        ...data
      })));
    }
  }, [batches, attendanceRecords, selectedDate]);

  const getOverallAttendanceChartData = () => ({
    labels: ['Online Present', 'Online Absent', 'Offline Present', 'Offline Absent'],
    datasets: [{
      data: [
        overallStats.onlinePresent,
        overallStats.onlineAbsent,
        overallStats.offlinePresent,
        overallStats.offlineAbsent
      ],
      backgroundColor: [
        '#3b82f6',
        '#93c5fd',
        '#14b8a6',
        '#5eead4'
      ],
      borderColor: [
        '#2563eb',
        '#60a5fa',
        '#0d9488',
        '#2dd4bf'
      ],
      borderWidth: 1
    }]
  });

  const getStudentDistributionData = () => ({
    labels: ['Online Students', 'Offline Students'],
    datasets: [{
      data: [overallStats.onlineStudents, overallStats.offlineStudents],
      backgroundColor: ['#3b82f6', '#14b8a6'],
      borderColor: ['#2563eb', '#0d9488'],
      borderWidth: 1
    }]
  });

  const getAttendanceRateData = () => {
    const onlineRate = overallStats.onlineStudents ? 
      (overallStats.onlinePresent / (overallStats.onlinePresent + overallStats.onlineAbsent)) * 100 : 0;
    const offlineRate = overallStats.offlineStudents ? 
      (overallStats.offlinePresent / (overallStats.offlinePresent + overallStats.offlineAbsent)) * 100 : 0;

    return {
      labels: ['Online', 'Offline'],
      datasets: [{
        label: 'Attendance Rate (%)',
        data: [onlineRate, offlineRate],
        backgroundColor: ['#3b82f6', '#14b8a6'],
        borderColor: ['#2563eb', '#0d9488'],
        borderWidth: 1
      }]
    };
  };

  const getOverallChartData = (stats) => ({
    labels: [
      'Online Present',
      'Online Absent',
      'Offline Present',
      'Offline Absent'
    ],
    datasets: [{
      data: [
        stats.attendance.onlinePresent,
        stats.attendance.onlineAbsent,
        stats.attendance.offlinePresent,
        stats.attendance.offlineAbsent
      ],
      backgroundColor: [
        '#3b82f6',
        '#93c5fd',
        '#14b8a6',
        '#5eead4'
      ],
      borderColor: [
        '#2563eb',
        '#60a5fa',
        '#0d9488',
        '#2dd4bf'
      ],
      borderWidth: 1
    }]
  });

  const getMarkingMethodChartData = (stats) => ({
    labels: ['Admin Marked', 'Device Marked', 'Location Verified'],
    datasets: [{
      data: [
        stats.attendance.adminMarked,
        stats.attendance.deviceMarked,
        stats.attendance.locationVerified
      ],
      backgroundColor: [
        '#8b5cf6',
        '#f59e0b',
        '#10b981'
      ],
      borderColor: [
        '#7c3aed',
        '#d97706',
        '#059669'
      ],
      borderWidth: 1
    }]
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      }
    },
    cutout: '70%'
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Attendance Rate by Mode'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Percentage (%)'
        }
      }
    }
  };

  const getAttendanceIcon = (record) => {
    if (record.markedByAdmin) {
      return <UserCheck className="w-4 h-4 text-purple-500" title="Marked by Admin" />;
    }
    if (record.deviceId) {
      return <Smartphone className="w-4 h-4 text-amber-500" title="Marked via Device" />;
    }
    if (record.location?.lat && record.location?.lng) {
      return <MapPin className="w-4 h-4 text-emerald-500" title="Location Verified" />;
    }
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <BookOpen className="mr-2" />
          Course Overview
        </h1>
        <p className="text-gray-600 mt-1">
          Overall attendance statistics and mode-wise distribution
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <BarChart className="mr-2" />
          Overall Attendance Statistics
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="h-64">
            <h4 className="text-lg font-semibold mb-4 text-center">Overall Attendance</h4>
            <Doughnut data={getOverallAttendanceChartData()} options={chartOptions} />
          </div>
          
          <div className="h-64">
            <h4 className="text-lg font-semibold mb-4 text-center">Student Distribution</h4>
            <Doughnut data={getStudentDistributionData()} options={chartOptions} />
          </div>

          <div className="h-64">
            <h4 className="text-lg font-semibold mb-4 text-center">Attendance Rate by Mode</h4>
            <Bar data={getAttendanceRateData()} options={barChartOptions} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Monitor className="text-blue-500 mr-2" size={20} />
                <span className="text-sm font-medium">Online Present Rate</span>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {overallStats.onlineStudents ? 
                  ((overallStats.onlinePresent / (overallStats.onlinePresent + overallStats.onlineAbsent)) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Building className="text-teal-500 mr-2" size={20} />
                <span className="text-sm font-medium">Offline Present Rate</span>
              </div>
              <span className="text-lg font-bold text-teal-600">
                {overallStats.offlineStudents ? 
                  ((overallStats.offlinePresent / (overallStats.offlinePresent + overallStats.offlineAbsent)) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="text-purple-500 mr-2" size={20} />
                <span className="text-sm font-medium">Total Students</span>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {overallStats.totalStudents}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CalendarIcon className="text-indigo-500 mr-2" size={20} />
                <span className="text-sm font-medium">Total Records</span>
              </div>
              <span className="text-lg font-bold text-indigo-600">
                {overallStats.totalAttendance}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Select Date</h3>
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          className="rounded-lg shadow-md"
          maxDate={new Date()}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {courseStats.map((stats) => (
          <div key={stats.course} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div 
              className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 cursor-pointer"
              onClick={() => setExpandedCourse(expandedCourse === stats.course ? null : stats.course)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-white">{stats.course}</h3>
                  <div className="mt-2 flex items-center gap-4 text-white/80">
                    <span className="flex items-center">
                      <Users className="mr-1" size={16} />
                      {stats.totalStudents} Students
                    </span>
                    <span className="flex items-center">
                      <Monitor className="mr-1" size={16} />
                      {stats.onlineStudents} Online
                    </span>
                    <span className="flex items-center">
                      <Building className="mr-1" size={16} />
                      {stats.offlineStudents} Offline
                    </span>
                  </div>
                </div>
                {expandedCourse === stats.course ? (
                  <ChevronUp className="text-white" size={24} />
                ) : (
                  <ChevronDown className="text-white" size={24} />
                )}
              </div>
            </div>

            {expandedCourse === stats.course && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="h-64">
                    <h4 className="text-lg font-semibold mb-4 text-center">Mode-wise Attendance</h4>
                    <Doughnut data={getOverallChartData(stats)} options={chartOptions} />
                  </div>
                  <div className="h-64">
                    <h4 className="text-lg font-semibold mb-4 text-center">Marking Methods</h4>
                    <Doughnut data={getMarkingMethodChartData(stats)} options={chartOptions} />
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <UserCheck className="text-purple-500 mr-2" size={20} />
                        <span className="text-sm font-medium">Admin Marked</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">
                        {stats.attendance.adminMarked}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Smartphone className="text-amber-500 mr-2" size={20} />
                        <span className="text-sm font-medium">Device Marked</span>
                      </div>
                      <span className="text-lg font-bold text-amber-600">
                        {stats.attendance.deviceMarked}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MapPin className="text-emerald-500 mr-2" size={20} />
                        <span className="text-sm font-medium">Location Verified</span>
                      </div>
                      <span className="text-lg font-bold text-emerald-600">
                        {stats.attendance.locationVerified}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CalendarIcon className="text-blue-500 mr-2" size={20} />
                        <span className="text-sm font-medium">Total Records</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {stats.attendance.present + stats.attendance.absent}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">
                    Attendance Details for {format(selectedDate, 'PPP')}
                  </h4>
                  {stats.batches.map(batch => (
                    <div key={batch.id} className="mb-6 bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium mb-4 pb-2 border-b">
                        {batch.name}
                        <span className="text-sm text-gray-500 ml-2">
                          ({batch.students} students)
                        </span>
                      </h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center mb-2">
                            <CheckCircle className="text-green-500 mr-2" size={16} />
                            <span className="text-sm font-medium">Present</span>
                          </div>
                          {batch.presentStudents.length > 0 ? (
                            <div className="space-y-2">
                              {batch.presentStudents.map((student) => (
                                <div key={student.id} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    {student.mode === 'online' ? (
                                      <Monitor className="w-4 h-4 text-blue-500" />
                                    ) : (
                                      <Building className="w-4 h-4 text-green-500" />
                                    )}
                                    <span>{student.name}</span>
                                    {getAttendanceIcon(student)}
                                  </div>
                                  <span className="text-gray-500">{format(new Date(student.date), 'HH:mm')}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 bg-white p-2 rounded">No present students</p>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center mb-2">
                            <XCircle className="text-red-500 mr-2" size={16} />
                            <span className="text-sm font-medium">Absent</span>
                          </div>
                          {batch.absentStudents.length > 0 ? (
                            <div className="space-y-2">
                              {batch.absentStudents.map((student) => (
                                <div key={student.id} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    {student.mode === 'online' ? (
                                      <Monitor className="w-4 h-4 text-blue-500" />
                                    ) : (
                                      <Building className="w-4 h-4 text-green-500" />
                                    )}
                                    <span>{student.name}</span>
                                    {getAttendanceIcon(student)}
                                  </div>
                                  <span className="text-gray-500">{format(new Date(student.date), 'HH:mm')}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 bg-white p-2 rounded">No absent students</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Courses;