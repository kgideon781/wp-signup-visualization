import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ComposedChart, Bar, BarChart, PieChart, Pie, Cell
} from 'recharts';
import Papa from 'papaparse';

const APHRCAnalyticsDashboard = () => {
    // CoP data states
    const [data2024, setData2024] = useState([]);
    const [data2025, setData2025] = useState([]);
    const [cumulativeData2024, setCumulativeData2024] = useState([]);
    const [cumulativeData2025, setCumulativeData2025] = useState([]);

    // Soma platform data states
    const [somaUsers, setSomaUsers] = useState([]);
    const [somaAnalytics, setSomaAnalytics] = useState({});

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('daily');
    const [activePlatform, setActivePlatform] = useState('cop');

    // Function to format dates for display
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    // Function to get month name
    const getMonthName = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('default', { month: 'short' });
    };

    // Parse last access time to get activity data
    const parseLastAccess = (lastAccessStr) => {
        // Check for empty, "never" (case insensitive), or null/undefined
        if (!lastAccessStr || lastAccessStr.trim() === '' || lastAccessStr.toLowerCase() === 'never') {
            return null;
        }

        if (lastAccessStr.toLowerCase() === 'now') {
            return new Date();
        }

        const now = new Date();

        // Parse different formats like "3 days 19 hours", "228 days 20 hours", "43 mins 56 secs"
        if (lastAccessStr.includes('year')) {
            const years = parseInt(lastAccessStr.match(/(\d+)\s*year/)?.[1] || 0);
            const days = parseInt(lastAccessStr.match(/(\d+)\s*day/)?.[1] || 0);
            return new Date(now.getTime() - (years * 365 + days) * 24 * 60 * 60 * 1000);
        }

        const daysMatch = lastAccessStr.match(/(\d+)\s*days?/);
        const hoursMatch = lastAccessStr.match(/(\d+)\s*hours?/);
        const minsMatch = lastAccessStr.match(/(\d+)\s*mins?/);
        const secsMatch = lastAccessStr.match(/(\d+)\s*secs?/);

        const days = daysMatch ? parseInt(daysMatch[1]) : 0;
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
        const secs = secsMatch ? parseInt(secsMatch[1]) : 0;

        const totalMilliseconds = (days * 24 * 60 * 60 + hours * 60 * 60 + mins * 60 + secs) * 1000;
        return new Date(now.getTime() - totalMilliseconds);
    };

    // Analyze Soma platform data
    const analyzeSomaData = (users) => {
        const activeUsers = [];
        const inactiveUsers = [];
        const activityByPeriod = {
            'Last 7 days': 0,
            'Last 30 days': 0,
            'Last 90 days': 0,
            'Last 180 days': 0,
            'More than 180 days': 0,
            'Never accessed': 0
        };

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

        users.forEach(user => {
            const lastAccess = parseLastAccess(user.lastaccess);

            if (!lastAccess) {
                inactiveUsers.push(user);
                activityByPeriod['Never accessed']++;
            } else {
                activeUsers.push({ ...user, lastAccessDate: lastAccess });

                if (lastAccess >= sevenDaysAgo) {
                    activityByPeriod['Last 7 days']++;
                } else if (lastAccess >= thirtyDaysAgo) {
                    activityByPeriod['Last 30 days']++;
                } else if (lastAccess >= ninetyDaysAgo) {
                    activityByPeriod['Last 90 days']++;
                } else if (lastAccess >= oneEightyDaysAgo) {
                    activityByPeriod['Last 180 days']++;
                } else {
                    activityByPeriod['More than 180 days']++;
                }
            }
        });

        // Debug logging
        console.log('Total users analyzed:', users.length);
        console.log('Active users:', activeUsers.length);
        console.log('Inactive users:', inactiveUsers.length);
        console.log('Activity breakdown:', activityByPeriod);
        console.log('Activity breakdown:', somaUsers);

        // Create daily activity chart data for the last 30 days
        const dailyActivity = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

            const activeCount = activeUsers.filter(user =>
                user.lastAccessDate >= dayStart && user.lastAccessDate < dayEnd
            ).length;

            dailyActivity.push({
                date: dateStr,
                displayDate: `${date.getMonth() + 1}/${date.getDate()}`,
                activeUsers: activeCount
            });
        }

        return {
            activeUsers,
            inactiveUsers,
            activityByPeriod,
            dailyActivity,
            totalUsers: users.length,
            totalActive: activeUsers.length,
            totalInactive: inactiveUsers.length
        };
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch CoP data
                const copResponse = await fetch('/wp_users.csv').then(res => res.text());
                const parsedCopData = Papa.parse(copResponse, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true
                });

                // Process CoP data (existing logic)
                const data2024Array = [];
                const data2025Array = [];

                parsedCopData.data.forEach(row => {
                    const yearFromDate = row.signup_date.split('-')[0];
                    const formattedRow = {
                        ...row,
                        date: formatDate(row.signup_date),
                        month: getMonthName(row.signup_date),
                        fullDate: row.signup_date
                    };

                    if (yearFromDate === '2024') {
                        data2024Array.push(formattedRow);
                    } else if (yearFromDate === '2025') {
                        data2025Array.push(formattedRow);
                    }
                });

                data2024Array.sort((a, b) => new Date(a.signup_date) - new Date(b.signup_date));
                data2025Array.sort((a, b) => new Date(a.signup_date) - new Date(b.signup_date));

                let runningTotal2024 = 0;
                const cumulative2024 = data2024Array.map(item => {
                    runningTotal2024 += item.signups;
                    return { ...item, cumulativeSignups: runningTotal2024 };
                });

                let runningTotal2025 = 0;
                const cumulative2025 = data2025Array.map(item => {
                    runningTotal2025 += item.signups;
                    return { ...item, cumulativeSignups: runningTotal2025 };
                });

                setData2024(data2024Array);
                setData2025(data2025Array);
                setCumulativeData2024(cumulative2024);
                setCumulativeData2025(cumulative2025);

                // Fetch Soma platform data
                try {
                    const somaResponse = await fetch('/Users (5).json').then(res => res.json());
                    // Handle the nested array structure
                    const somaUsersData = Array.isArray(somaResponse) && Array.isArray(somaResponse[0]) ? somaResponse[0] : somaResponse;
                    setSomaUsers(somaUsersData);

                    // Debug: Check the data
                    console.log('Soma users data:', somaUsersData);
                    console.log('Total users:', somaUsersData.length);
                    console.log('Sample user:', somaUsersData[0]);

                    // Check for users with "Never" access
                    const neverAccessedUsers = somaUsersData.filter(user =>
                        !user.lastaccess ||
                        user.lastaccess.trim() === '' ||
                        user.lastaccess.toLowerCase() === 'never'
                    );
                    console.log('Users who never accessed:', neverAccessedUsers.length);
                    console.log('Never accessed users:', neverAccessedUsers);

                    const analytics = analyzeSomaData(somaUsersData);
                    console.log('Analytics result:', analytics);

                    setSomaAnalytics(analytics);
                } catch (somaError) {
                    console.warn('Soma data not available:', somaError);
                    setSomaUsers([]);
                    setSomaAnalytics({});
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, [analyzeSomaData]);

    // Generate monthly data for comparison (existing function)
    const getMonthlyData = (yearData) => {
        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyMap = {};

        yearData.forEach(item => {
            const monthYear = item.signup_date.substring(0, 7);
            const monthName = new Date(item.signup_date).toLocaleString('default', { month: 'short' });

            if (!monthlyMap[monthYear]) {
                monthlyMap[monthYear] = {
                    month: monthName,
                    monthYear: monthYear,
                    monthIndex: monthOrder.indexOf(monthName),
                    signups: 0
                };
            }
            monthlyMap[monthYear].signups += item.signups;
        });

        return Object.values(monthlyMap).sort((a, b) => a.monthIndex - b.monthIndex);
    };

    const monthlyData2024 = getMonthlyData(data2024);
    const monthlyData2025 = getMonthlyData(data2025);

    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-gray-200 rounded shadow-md">
                    <p className="font-semibold">{payload[0].payload.fullDate || payload[0].payload.date}</p>
                    <p className="text-blue-600">{payload[0].name}: {payload[0].value}</p>
                    {payload.length > 1 && (
                        <p className="text-green-600">{payload[1].name}: {payload[1]?.value}</p>
                    )}
                </div>
            );
        }
        return null;
    };

    // Prepare pie chart data for Soma platform
    const pieChartData = somaAnalytics.activityByPeriod ? Object.entries(somaAnalytics.activityByPeriod).map(([period, count]) => ({
        name: period,
        value: count,
        percentage: ((count / somaAnalytics.totalUsers) * 100).toFixed(1)
    })) : [];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

    if (loading) {
        return <div className="text-center p-8">Loading analytics data...</div>;
    }

    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold mb-6 text-center">APHRC Analytics Dashboard</h1>

            {/* Platform Navigation */}
            <div className="flex justify-center mb-6">
                <button
                    className={`px-6 py-2 mx-2 rounded-lg ${activePlatform === 'cop' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    onClick={() => setActivePlatform('cop')}
                >
                    CoP
                </button>
                <button
                    className={`px-6 py-2 mx-2 rounded-lg ${activePlatform === 'soma' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                    onClick={() => setActivePlatform('soma')}
                >
                    VLA
                </button>
            </div>

            {activePlatform === 'cop' && (
                <div>
                    <h2 className="text-2xl font-semibold mb-4 text-center">CoP User Acquisition Trends 2024 - 2025</h2>

                    {/* Summary Cards for CoP */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-blue-50 p-6 rounded-lg text-center">
                            <h3 className="text-2xl font-bold text-blue-600">
                                {(cumulativeData2024.length > 0 ? cumulativeData2024[cumulativeData2024.length - 1].cumulativeSignups : 0) +
                                    (cumulativeData2025.length > 0 ? cumulativeData2025[cumulativeData2025.length - 1].cumulativeSignups : 0)}
                            </h3>
                            <p className="text-gray-600">Total Signups (All Time)</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg text-center">
                            <h3 className="text-2xl font-bold text-green-600">
                                {cumulativeData2024.length > 0 ? cumulativeData2024[cumulativeData2024.length - 1].cumulativeSignups : 0}
                            </h3>
                            <p className="text-gray-600">2024 Signups</p>
                        </div>
                        <div className="bg-red-50 p-6 rounded-lg text-center">
                            <h3 className="text-2xl font-bold text-red-600">
                                {cumulativeData2025.length > 0 ? cumulativeData2025[cumulativeData2025.length - 1].cumulativeSignups : 0}
                            </h3>
                            <p className="text-gray-600">2025 Signups (YTD)</p>
                        </div>
                    </div>

                    {/* Tab Navigation for CoP */}
                    <div className="flex justify-center mb-6">
                        <button
                            className={`px-4 py-2 mx-2 rounded ${activeTab === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                            onClick={() => setActiveTab('daily')}
                        >
                            Daily Signups
                        </button>
                        <button
                            className={`px-4 py-2 mx-2 rounded ${activeTab === 'cumulative' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                            onClick={() => setActiveTab('cumulative')}
                        >
                            Cumulative Growth
                        </button>
                        <button
                            className={`px-4 py-2 mx-2 rounded ${activeTab === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                            onClick={() => setActiveTab('monthly')}
                        >
                            Monthly Comparison
                        </button>
                    </div>

                    {/* CoP Charts */}
                    {activeTab === 'daily' && (
                        <>
                            <div className="mb-12">
                                <h3 className="text-xl font-semibold mb-4 text-center">2024 Daily Signups</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={data2024} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={Math.floor(data2024.length / 20)} />
                                        <YAxis />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Line type="monotone" dataKey="signups" stroke="#2563eb" activeDot={{ r: 8 }} name="Daily Signups" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-xl font-semibold mb-4 text-center">2025 Daily Signups</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={data2025} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={Math.floor(data2025.length / 20)} />
                                        <YAxis />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Line type="monotone" dataKey="signups" stroke="#dc2626" activeDot={{ r: 8 }} name="Daily Signups" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}

                    {activeTab === 'cumulative' && (
                        <>
                            <div className="mb-12">
                                <h3 className="text-xl font-semibold mb-4 text-center">2024 Cumulative Growth</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <ComposedChart data={cumulativeData2024} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={Math.floor(cumulativeData2024.length / 20)} />
                                        <YAxis yAxisId="left" />
                                        <YAxis yAxisId="right" orientation="right" />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="signups" fill="#9333ea" barSize={5} name="Daily Signups" />
                                        <Line yAxisId="right" type="monotone" dataKey="cumulativeSignups" stroke="#059669" strokeWidth={2} name="Total Signups" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-xl font-semibold mb-4 text-center">2025 Cumulative Growth</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <ComposedChart data={cumulativeData2025} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={Math.floor(cumulativeData2025.length / 20)} />
                                        <YAxis yAxisId="left" />
                                        <YAxis yAxisId="right" orientation="right" />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="signups" fill="#9333ea" barSize={5} name="Daily Signups" />
                                        <Line yAxisId="right" type="monotone" dataKey="cumulativeSignups" stroke="#059669" strokeWidth={2} name="Total Signups" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}

                    {activeTab === 'monthly' && (
                        <div className="mb-8">
                            <h3 className="text-xl font-semibold mb-4 text-center">Monthly Signups Comparison</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="signups" name="2024" data={monthlyData2024} fill="#2563eb" barSize={20} />
                                    <Bar dataKey="signups" name="2025" data={monthlyData2025} fill="#dc2626" barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* CoP Statistics */}
                    <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">Signup Statistics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded shadow">
                                <p className="text-sm text-gray-600">Average daily signups (2024)</p>
                                <p className="text-lg font-bold text-blue-600">
                                    {data2024.length > 0 ? (cumulativeData2024[cumulativeData2024.length - 1].cumulativeSignups / data2024.length).toFixed(1) : 0}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded shadow">
                                <p className="text-sm text-gray-600">Average daily signups (2025)</p>
                                <p className="text-lg font-bold text-red-600">
                                    {data2025.length > 0 ? (cumulativeData2025[cumulativeData2025.length - 1].cumulativeSignups / data2025.length).toFixed(1) : 0}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded shadow">
                                <p className="text-sm text-gray-600">Growth rate (2025 vs 2024)</p>
                                <p className="text-lg font-bold text-purple-600">
                                    {cumulativeData2024.length > 0 && cumulativeData2025.length > 0 ?
                                        `${(((cumulativeData2025[cumulativeData2025.length - 1].cumulativeSignups / data2025.length) /
                                            (cumulativeData2024[cumulativeData2024.length - 1].cumulativeSignups / data2024.length) - 1) * 100).toFixed(1)}%` :
                                        'N/A'}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded shadow">
                                <p className="text-sm text-gray-600">Days with signups recorded</p>
                                <p className="text-lg font-bold text-gray-700">
                                    2024: {data2024.length} | 2025: {data2025.length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activePlatform === 'soma' && somaAnalytics.totalUsers && (
                <div>
                    <h2 className="text-2xl font-semibold mb-6 text-center">APHRC Virtual Learning Academy Analytics</h2>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-blue-50 p-6 rounded-lg text-center">
                            <h3 className="text-2xl font-bold text-blue-600">{somaAnalytics.totalUsers}</h3>
                            <p className="text-gray-600">Total Registered Users</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg text-center">
                            <h3 className="text-2xl font-bold text-green-600">{somaAnalytics.totalActive}</h3>
                            <p className="text-gray-600">Users Who Have Accessed</p>
                        </div>
                        <div className="bg-red-50 p-6 rounded-lg text-center">
                            <h3 className="text-2xl font-bold text-red-600">{somaAnalytics.totalInactive}</h3>
                            <p className="text-gray-600">Never Accessed</p>
                        </div>
                    </div>

                    {/* Activity Distribution Pie Chart */}
                    <div className="mb-8">
                        <h3 className="text-xl font-semibold mb-4 text-center">User Activity Distribution</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`${value} users`, name]} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Daily Activity Chart */}
                    {somaAnalytics.dailyActivity && (
                        <div className="mb-8">
                            <h3 className="text-xl font-semibold mb-4 text-center">Daily Active Users (Last 30 Days)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={somaAnalytics.dailyActivity} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} interval={4} />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value) => [`${value} users`, 'Active Users']}
                                        labelFormatter={(label) => `Date: ${label}`}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="activeUsers" stroke="#059669" strokeWidth={2} name="Active Users" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Activity Breakdown Table */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">Activity Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(somaAnalytics.activityByPeriod).map(([period, count]) => (
                                <div key={period} className="bg-white p-4 rounded shadow flex justify-between items-center">
                                    <span className="font-medium">{period}</span>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-blue-600">{count}</span>
                                        <span className="text-sm text-gray-500 ml-2">
                                            ({((count / somaAnalytics.totalUsers) * 100).toFixed(1)}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activePlatform === 'soma' && !somaAnalytics.totalUsers && (
                <div className="text-center p-8">
                    <p className="text-gray-600">No Soma platform data available. Please ensure 'Users (5).json' is available in the root directory.</p>
                </div>
            )}
        </div>
    );
};

export default APHRCAnalyticsDashboard;