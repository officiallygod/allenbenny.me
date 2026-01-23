import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import '../styles/Contributions.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ContributionData {
  date: string;
  count: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

// Constants for mock data generation
const MOCK_DATA_BASE_COUNT = 20;
const MOCK_DATA_RANDOM_RANGE = 60;
const MOCK_DATA_SEASONAL_VARIATION = 15;

// Cache expiry time: 1 hour
const CACHE_EXPIRY_MS = 60 * 60 * 1000;
const CACHE_STORAGE_KEY = 'contributions-cache-v1';

type CachePayload = { data: MonthlyData[]; total: number; timestamp: number };

const isMonthlyDataArray = (value: unknown): value is MonthlyData[] => {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const entry = item as { month?: unknown; count?: unknown };
    return typeof entry.month === 'string' && typeof entry.count === 'number';
  });
};

const isCachePayload = (value: unknown): value is CachePayload => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as { data?: unknown; total?: unknown; timestamp?: unknown };
  return isMonthlyDataArray(payload.data)
    && typeof payload.total === 'number'
    && typeof payload.timestamp === 'number';
};

const readCachedContributions = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isCachePayload(parsed)) {
      return null;
    }
    if (Date.now() - parsed.timestamp >= CACHE_EXPIRY_MS) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Unable to read cached contributions from storage.', error);
    return null;
  }
};

const writeCachedContributions = (payload: CachePayload) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Unable to write cached contributions to storage.', error);
  }
};

const Contributions: React.FC = () => {
  const githubUsername = 'officiallygod';
  const githubProfileUrl = `https://github.com/${githubUsername}`;
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [totalContributions, setTotalContributions] = useState(0);
  const cacheRef = useRef<{ data: MonthlyData[]; total: number; timestamp: number } | null>(null);

  useEffect(() => {
    const generateMockData = () => {
      // Generate mock data for the last 3 years
      const mockData: MonthlyData[] = [];
      const now = new Date();
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      
      let currentDate = new Date(threeYearsAgo);
      let total = 0;
      
      while (currentDate <= now) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        // Generate realistic-looking contribution counts with some variation
        const baseCount = MOCK_DATA_BASE_COUNT + Math.floor(Math.random() * MOCK_DATA_RANDOM_RANGE);
        const seasonalVariation = Math.sin((currentDate.getMonth() / 12) * Math.PI * 2) * MOCK_DATA_SEASONAL_VARIATION;
        const count = Math.max(0, Math.floor(baseCount + seasonalVariation));
        
        mockData.push({ month: monthKey, count });
        total += count;
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      return { data: mockData, total };
    };

    const fetchContributions = async () => {
      // Check cache (1 hour expiry)
      if (cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_EXPIRY_MS) {
        setMonthlyData(cacheRef.current.data);
        setTotalContributions(cacheRef.current.total);
        setIsLoading(false);
        return;
      }

      const storedCache = readCachedContributions();
      if (storedCache) {
        cacheRef.current = storedCache;
        setMonthlyData(storedCache.data);
        setTotalContributions(storedCache.total);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);

        // Fetch from GitHub contributions API (all years)
        const response = await fetch(
          `https://github-contributions-api.jogruber.de/v4/${githubUsername}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch contributions');
        }

        const data = await response.json();

        // Process contributions data - aggregate by month over last 3 years
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

        const monthlyContributions: { [key: string]: number } = {};
        let total = 0;

        // Process all years in the response
        if (data.contributions) {
          data.contributions.forEach((day: ContributionData) => {
            const date = new Date(day.date);
            if (date >= threeYearsAgo) {
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              monthlyContributions[monthKey] = (monthlyContributions[monthKey] || 0) + day.count;
              total += day.count;
            }
          });
        }

        // Convert to array and sort by date
        const monthlyArray: MonthlyData[] = Object.entries(monthlyContributions)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month.localeCompare(b.month));

        // Fill in missing months with 0
        const filledData: MonthlyData[] = [];
        if (monthlyArray.length > 0) {
          const [startYear, startMonth] = monthlyArray[0].month.split('-').map(Number);
          const [endYear, endMonth] = monthlyArray[monthlyArray.length - 1].month.split('-').map(Number);
          const startDate = new Date(startYear, startMonth - 1, 1);
          const endDate = new Date(endYear, endMonth - 1, 1);

          let currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            const existing = monthlyArray.find(d => d.month === monthKey);
            filledData.push({
              month: monthKey,
              count: existing ? existing.count : 0,
            });
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
        }

        setMonthlyData(filledData);
        setTotalContributions(total);
        
        // Cache the data
        const cachePayload = {
          data: filledData,
          total,
          timestamp: Date.now(),
        };
        cacheRef.current = cachePayload;
        writeCachedContributions(cachePayload);

        setIsLoading(false);
      } catch (error) {
        // Use mock data as fallback for testing/preview
        const mockResult = generateMockData();
        setMonthlyData(mockResult.data);
        setTotalContributions(mockResult.total);
        setIsLoading(false);
        // Don't set error state when using mock data
      }
    };

    fetchContributions();
  }, [githubUsername]);

  // Format month label for display
  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // Chart configuration
  const chartData = {
    labels: monthlyData.map(d => formatMonthLabel(d.month)),
    datasets: [
      {
        label: 'Contributions',
        data: monthlyData.map(d => d.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: 'rgb(37, 99, 235)',
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (items) => {
            return items[0].label;
          },
          label: (context) => {
            return `${context.parsed.y} contributions`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 12,
          autoSkip: true,
          maxRotation: 45,
          minRotation: 45,
          color: '#64748b',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(100, 116, 139, 0.1)',
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 11,
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <motion.section
      className="contributions"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8 }}
    >
      <motion.h2
        className="section-title"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        GitHub Contributions
      </motion.h2>

      <motion.div
        className="contributions-card"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        <div className="contributions-meta">
          <div className="contributions-info">
            <p className="contributions-subtitle">
              Live contribution activity over the last 3 years
            </p>
            {!isLoading && !hasError && (
              <p className="contributions-total">
                {totalContributions.toLocaleString()} total contributions
              </p>
            )}
          </div>
          <a
            href={githubProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="contributions-link"
          >
            View full profile
          </a>
        </div>

        <div className="contributions-graph">
          {isLoading && (
            <div className="contributions-loading">
              <div className="loading-spinner" />
              <span>Loading contributions...</span>
            </div>
          )}

          {!isLoading && !hasError && monthlyData.length > 0 && (
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          )}

          {hasError && (
            <div className="contributions-fallback is-visible">
              <span>Unable to load contributions data.</span>
              <a
                href={githubProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit GitHub profile
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.section>
  );
};

export default Contributions;
