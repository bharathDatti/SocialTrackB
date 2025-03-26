import React from 'react';
import { useSelector } from 'react-redux';
import { BarChart, Users, Calendar, Clock } from 'lucide-react';

const Dashboard = () => {
  const { batches } = useSelector(state => state.batches);
  const { attendanceRecords } = useSelector(state => state.attendance);

  // Calculate total batches and students
  const totalBatches = batches?.length || 0;
  const totalStudents = batches?.reduce((acc, batch) => acc + (batch.students?.length || 0), 0) || 0;

  // Enhanced stats calculation
  const stats = {
    totalBatches,
    totalStudents,
    // Total Attendance: Unique days with at least one attendance record
    totalAttendance: attendanceRecords?.length > 0
      ? [...new Set(attendanceRecords.map(record => new Date(record.date).toDateString()))].length
      : 0,
    // Average Attendance: Percentage of present records across all students and days
    averageAttendance: attendanceRecords?.length > 0
      ? Math.round(
          (attendanceRecords.filter(record => record.status === 'present').length / attendanceRecords.length) * 100
        )
      : 0
  };

  // Calculate students with attendance < 70%
  const getStudentAttendancePercentage = () => {
    if (!attendanceRecords?.length || !batches?.length) return [];

    // Group attendance records by student
    const studentAttendance = {};
    attendanceRecords.forEach(record => {
      if (!studentAttendance[record.studentId]) {
        studentAttendance[record.studentId] = {
          name: record.studentName,
          batchName: record.batchName,
          total: 0,
          present: 0
        };
      }
      studentAttendance[record.studentId].total += 1;
      if (record.status === 'present') {
        studentAttendance[record.studentId].present += 1;
      }
    });

    // Calculate percentage and filter students < 70%
    const lowAttendanceStudents = Object.entries(studentAttendance)
      .map(([studentId, data]) => ({
        studentId,
        studentName: data.name,
        batchName: data.batchName,
        percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
        lastRecord: attendanceRecords
          .filter(record => record.studentId === studentId)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0] // Most recent record
      }))
      .filter(student => student.percentage < 70)
      .sort((a, b) => a.percentage - b.percentage); // Sort by lowest percentage first

    return lowAttendanceStudents.slice(0, 5); // Limit to top 5
  };

  const lowAttendanceStudents = getStudentAttendancePercentage();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-primary-100 p-3 rounded-full">
              <Users className="text-primary-600 h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Batches</p>
              <h3 className="text-2xl font-bold">{stats.totalBatches}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <Calendar className="text-green-600 h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Students</p>
              <h3 className="text-2xl font-bold">{stats.totalStudents}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="text-yellow-600 h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Days with Attendance</p>
              <h3 className="text-2xl font-bold">{stats.totalAttendance}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <BarChart className="text-blue-600 h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Average Attendance</p>
              <h3 className="text-2xl font-bold">{stats.averageAttendance}%</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Students Below 70% Attendance</h2>
            {lowAttendanceStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Batch</th>
                      <th className="text-left py-3 px-4">Student</th>
                      <th className="text-left py-3 px-4">Attendance %</th>
                      <th className="text-left py-3 px-4">Last Status</th>
                      <th className="text-left py-3 px-4">Last Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowAttendanceStudents.map((student, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4">{student.batchName}</td>
                        <td className="py-3 px-4">{student.studentName}</td>
                        <td className="py-3 px-4">{student.percentage}%</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            student.lastRecord.status === 'present' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.lastRecord.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {new Date(student.lastRecord.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No students with attendance below 70%
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;