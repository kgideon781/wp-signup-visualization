import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ComposedChart, Bar, BarChart
} from 'recharts';
import Papa from 'papaparse';

const SignupTrends = () => {
    const [data2024, setData2024] = useState([]);
    const [data2025, setData2025] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cumulativeData2024, setCumulativeData2024] = useState([]);
    const [cumulativeData2025, setCumulativeData2025] = useState([]);
    const [activeTab, setActiveTab] = useState('daily');

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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/wp_users.csv').then(res => res.text());

                const parsedData = Papa.parse(response, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true
                });

                // Separate data by year
                const data2024Array = [];
                const data2025Array = [];

                parsedData.data.forEach(row => {
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

                // Sort by date ascending
                data2024Array.sort((a, b) => new Date(a.signup_date) - new Date(b.signup_date));
                data2025Array.sort((a, b) => new Date(a.signup_date) - new Date(b.signup_date));

                // Calculate cumulative signups
                let runningTotal2024 = 0;
                const cumulative2024 = data2024Array.map(item => {
                    runningTotal2024 += item.signups;
                    return {
                        ...item,
                        cumulativeSignups: runningTotal2024
                    };
                });

                let runningTotal2025 = 0;
                const cumulative2025 = data2025Array.map(item => {
                    runningTotal2025 += item.signups;
                    return {
                        ...item,
                        cumulativeSignups: runningTotal2025
                    };
                });

                setData2024(data2024Array);
                setData2025(data2025Array);
                setCumulativeData2024(cumulative2024);
                setCumulativeData2025(cumulative2025);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Generate monthly data for comparison
    const getMonthlyData = (yearData) => {
        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyMap = {};

        yearData.forEach(item => {
            const monthYear = item.signup_date.substring(0, 7); // YYYY-MM format
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

    // Custom tooltip to show date and signups
    const CustomTooltip = ({ active, payload}) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-gray-200 rounded shadow-md">
                    <p className="font-semibold">{payload[0].payload.fullDate}</p>
                    <p className="text-blue-600">Signups: {payload[0].value}</p>
                    {payload.length > 1 && (
                        <p className="text-green-600">Cumulative: {payload[1]?.value}</p>
                    )}
                </div>
            );
        }
        return null;
    };

    // Monthly tooltip
    if (loading) {
        return <div className="text-center p-8">Loading signup data...</div>;
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-6 text-center">WordPress User Signup Trends</h1>

            {/* Tab Navigation */}
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

            {activeTab === 'daily' && (
                <>
                    <div className="mb-12">
                        <h2 className="text-xl font-semibold mb-4 text-center">2024 Daily Signups</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={data2024}
                                margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    padding={{ left: 20, right: 20 }}
                                    tick={{ fontSize: 12 }}
                                    interval={Math.floor(data2024.length / 20)}
                                />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="signups"
                                    stroke="#2563eb"
                                    activeDot={{ r: 8 }}
                                    name="Daily Signups"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 text-center">2025 Daily Signups</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={data2025}
                                margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    padding={{ left: 20, right: 20 }}
                                    tick={{ fontSize: 12 }}
                                    interval={Math.floor(data2025.length / 20)}
                                />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="signups"
                                    stroke="#dc2626"
                                    activeDot={{ r: 8 }}
                                    name="Daily Signups"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            {activeTab === 'cumulative' && (
                <>
                    <div className="mb-12">
                        <h2 className="text-xl font-semibold mb-4 text-center">2024 Cumulative Growth</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart
                                data={cumulativeData2024}
                                margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    padding={{ left: 20, right: 20 }}
                                    tick={{ fontSize: 12 }}
                                    interval={Math.floor(cumulativeData2024.length / 20)}
                                />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar
                                    yAxisId="left"
                                    dataKey="signups"
                                    fill="#9333ea"
                                    barSize={5}
                                    name="Daily Signups"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="cumulativeSignups"
                                    stroke="#059669"
                                    strokeWidth={2}
                                    name="Total Signups"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 text-center">2025 Cumulative Growth</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart
                                data={cumulativeData2025}
                                margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    padding={{ left: 20, right: 20 }}
                                    tick={{ fontSize: 12 }}
                                    interval={Math.floor(cumulativeData2025.length / 20)}
                                />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar
                                    yAxisId="left"
                                    dataKey="signups"
                                    fill="#9333ea"
                                    barSize={5}
                                    name="Daily Signups"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="cumulativeSignups"
                                    stroke="#059669"
                                    strokeWidth={2}
                                    name="Total Signups"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            {activeTab === 'monthly' && (
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-center">Monthly Signups Comparison</h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                            margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="month"
                                padding={{ left: 10, right: 10 }}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey="signups"
                                name="2024"
                                data={monthlyData2024}
                                fill="#2563eb"
                                barSize={20}
                            />
                            <Bar
                                dataKey="signups"
                                name="2025"
                                data={monthlyData2025}
                                fill="#dc2626"
                                barSize={20}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="mt-8 text-sm text-gray-600">
                <p>Total signups in 2024: {cumulativeData2024.length > 0 ? cumulativeData2024[cumulativeData2024.length - 1].cumulativeSignups : 0}</p>
                <p>Total signups in 2025 (YTD): {cumulativeData2025.length > 0 ? cumulativeData2025[cumulativeData2025.length - 1].cumulativeSignups : 0}</p>
                <p>Data range: 2024-01-26 to 2025-04-08</p>
            </div>

            {/* Statistics Summary */}
            <div className="mt-10 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Signup Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded shadow">
                        <h4 className="font-medium text-blue-600">2024 Highlights</h4>
                        <ul className="mt-2 space-y-1">
                            <li>Peak month: {monthlyData2024.reduce((max, item) => item.signups > max.signups ? item : max, {signups: 0}).month} ({monthlyData2024.reduce((max, item) => item.signups > max.signups ? item : max, {signups: 0}).signups} signups)</li>
                            <li>Average monthly signups: {Math.round(monthlyData2024.reduce((sum, item) => sum + item.signups, 0) / monthlyData2024.length)}</li>
                        </ul>
                    </div>
                    <div className="bg-white p-3 rounded shadow">
                        <h4 className="font-medium text-red-600">2025 Highlights (YTD)</h4>
                        <ul className="mt-2 space-y-1">
                            <li>Peak month: {monthlyData2025.reduce((max, item) => item.signups > max.signups ? item : max, {signups: 0}).month} ({monthlyData2025.reduce((max, item) => item.signups > max.signups ? item : max, {signups: 0}).signups} signups)</li>
                            <li>Average monthly signups: {Math.round(monthlyData2025.reduce((sum, item) => sum + item.signups, 0) / monthlyData2025.length)}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupTrends;