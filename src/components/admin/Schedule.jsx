import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Users, 
  Monitor, 
  Building,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Search,
  Info,
  BarChart2,
  UserCheck,
  Smartphone,
  AlertTriangle
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { toast } from 'react-toastify';
import { fetchStudentHistory, clearHistory } from '../../store/slices/scheduleSlice';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Schedule = () => {
  const dispatch = useDispatch();
  const { batches } = useSelector(state => state.batches);
  const { history, stats, loading, error } = useSelector(state => state.schedule);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [chartData, setChartData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const courses = [...new Set(batches.map(batch => batch.course))];
  const courseBatches = selectedCourse 
    ? batches.filter(batch => batch.course === selectedCourse)
    : [];
  const selectedBatchData = batches.find(batch => batch.id === selectedBatch);
  const batchStudents = selectedBatchData?.students || [];

  // Get selected student's mode
  const selectedStudentData = selectedBatchData?.students?.find(s => s.id === selectedStudent);
  const studentMode = selectedStudentData?.mode;

  const filteredStudents = batchStudents.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchLower) ||
      student.rollNumber?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    if (selectedStudent && selectedBatch) {
      dispatch(fetchStudentHistory({ 
        batchId: selectedBatch, 
        studentId: selectedStudent
      }))
        .unwrap()
        .catch(err => {
          console.error('Error fetching history:', err);
          toast.error('Failed to fetch attendance history');
        });
    }
  }, [selectedStudent, selectedBatch, dispatch]);

  useEffect(() => {
    if (history.length > 0) {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      const days = eachDayOfInterval({ start, end });

      const monthlyData = days.map(day => {
        const record = history.find(r => 
          format(new Date(r.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
        );
        return {
          date: format(day, 'dd'),
          present: record?.status === 'present' ? 1 : 0,
          mode: record?.mode || null,
          markedByAdmin: record?.markedByAdmin || false
        };
      });

      setChartData({
        labels: monthlyData.map(d => d.date),
        datasets: [
          {
            label: 'Online Attendance',
            data: monthlyData.map(d => d.present && d.mode === 'online' ? 1 : 0),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            tension: 0.4
          },
          {
            label: 'Offline Attendance',
            data: monthlyData.map(d => d.present && d.mode === 'offline' ? 1 : 0),
            borderColor: 'rgb(20, 184, 166)',
            backgroundColor: 'rgba(20, 184, 166, 0.5)',
            tension: 0.4
          },
          {
            label: 'Admin Marked',
            data: monthlyData.map(d => d.present && d.markedByAdmin ? 1 : 0),
            borderColor: 'rgb(139, 92, 246)',
            backgroundColor: 'rgba(139, 92, 246, 0.5)',
            tension: 0.4
          }
        ]
      });
    } else {
      setChartData(null);
    }
  }, [history, selectedDate]);

  const handleCourseChange = (e) => {
    setSelectedCourse(e.target.value);
    setSelectedBatch('');
    setSelectedStudent('');
    dispatch(clearHistory());
  };

  const handleBatchChange = (e) => {
    setSelectedBatch(e.target.value);
    setSelectedStudent('');
    dispatch(clearHistory());
  };

  const handleStudentChange = (e) => {
    setSelectedStudent(e.target.value);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="spinner-border text-primary-600" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        <div className="flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="mr-2" />
          <p>Error: {error}</p>
        </div>
        <button 
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          onClick={() => {
            if (selectedStudent && selectedBatch) {
              dispatch(fetchStudentHistory({ batchId: selectedBatch, studentId: selectedStudent }));
            }
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <CalendarIcon className="mr-2" />
          Student Attendance History
        </h1>
        <p className="text-gray-600 mt-1">
          View detailed attendance records and statistics for individual students
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Course
            </label>
            <select
              className="form-control"
              value={selectedCourse}
              onChange={handleCourseChange}
            >
              <option value="">Choose a course</option>
              {courses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Batch
            </label>
            <select
              className="form-control"
              value={selectedBatch}
              onChange={handleBatchChange}
              disabled={!selectedCourse}
            >
              <option value="">Choose a batch</option>
              {courseBatches.map(batch => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Student
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or roll number..."
                className="form-control pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!selectedBatch}
              />
            </div>
          </div>
        </div>

        {selectedBatch && filteredStudents.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Select Student</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedStudent === student.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                  onClick={() => setSelectedStudent(student.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.rollNumber}</p>
                    </div>
                    <div className={`p-2 rounded-full ${
                      student.mode === 'online'
                        ? 'bg-blue-100'
                        : 'bg-green-100'
                    }`}>
                      {student.mode === 'online' ? (
                        <Monitor className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Building className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedStudent && stats ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="text-blue-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Total Classes</p>
                  <h3 className="text-2xl font-bold">{stats.total}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="text-green-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Attendance Rate</p>
                  <h3 className="text-2xl font-bold">{stats.percentage.toFixed(1)}%</h3>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-full">
                  <UserCheck className="text-purple-600 h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Admin Marked</p>
                  <h3 className="text-2xl font-bold">{stats.adminMarked}</h3>
                </div>
              </div>
            </div>

            {studentMode === 'online' ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Monitor className="text-blue-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Online Sessions</p>
                    <h3 className="text-2xl font-bold">{stats.online}</h3>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Building className="text-orange-600 h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Offline Sessions</p>
                    <h3 className="text-2xl font-bold">{stats.offline}</h3>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Monthly Attendance Trend</h3>
              <input
                type="month"
                className="form-control max-w-xs"
                value={format(selectedDate, 'yyyy-MM')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
              />
            </div>
            <div className="h-64">
              {chartData ? (
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                          stepSize: 1,
                          callback: value => value === 1 ? 'Present' : 'Absent'
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top'
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            return context.raw === 1 ? 'Present' : 'Absent';
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No attendance data available for this month
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Attendance History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marked By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.length > 0 ? (
                    history.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status === 'present' ? (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-1" />
                            )}
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.mode === 'online'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {record.mode === 'online' ? (
                              <Monitor className="w-4 h-4 mr-1" />
                            ) : (
                              <Building className="w-4 h-4 mr-1" />
                            )}
                            {record.mode.charAt(0).toUpperCase() + record.mode.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {format(new Date(record.date), 'hh:mm a')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            {getAttendanceIcon(record)}
                            <span className={`ml-1 ${
                              record.markedByAdmin ? 'text-purple-600' : 'text-gray-600'
                            }`}>
                              {record.markedByAdmin ? 'Admin' : 'Self'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.location ? (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1 text-emerald-500" />
                              <span className="text-xs">
                                {record.location.lat.toFixed(6)}, {record.location.lng.toFixed(6)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not available</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No attendance history available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 bg-white rounded-lg shadow-md p-8">
          <Info size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-lg">Please select a student to view attendance history</p>
        </div>
      )}
    </div>
  );
};

export default Schedule;