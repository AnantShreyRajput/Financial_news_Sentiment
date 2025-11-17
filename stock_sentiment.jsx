import React, { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity, Bell, Download, Plus, Trash2, RefreshCw, Moon, Sun } from 'lucide-react';

const FinancialSentimentApp = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [ticker, setTicker] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [watchlist, setWatchlist] = useState(['AAPL', 'GOOGL', 'MSFT']);
  const [historicalData, setHistoricalData] = useState({});
  // Removed unused state: compareMode, selectedStocks, activeTab

  // Mock news headlines for different tickers
  const mockNewsData = {
    'AAPL': [
      'Apple announces breakthrough in AI chip technology',
      'iPhone sales exceed expectations in Q4',
      'Apple faces regulatory challenges in EU markets',
      'New MacBook Pro receives critical acclaim',
      'Apple services revenue hits all-time high',
      'Concerns over supply chain disruptions',
      'Apple Vision Pro preorders surpass estimates',
      'Tim Cook discusses sustainability initiatives'
    ],
    'GOOGL': [
      'Google AI model outperforms competitors in benchmarks',
      'Alphabet reports strong cloud revenue growth',
      'Privacy concerns raised over new Google features',
      'Google announces quantum computing breakthrough',
      'YouTube ad revenue shows resilience',
      'Regulatory scrutiny intensifies',
      'Google Workspace gains enterprise market share',
      'Search algorithm updates improve user experience'
    ],
    'MSFT': [
      'Microsoft Cloud revenue surges 30%',
      'Azure gains market share against competitors',
      'Windows 12 announcement receives positive feedback',
      'Microsoft AI integration drives productivity gains',
      'Gaming division reports record engagement',
      'LinkedIn revenue exceeds projections',
      'Enterprise adoption of Copilot accelerates',
      'Microsoft announces sustainability milestone'
    ],
    'TSLA': [
      'Tesla deliveries beat analyst estimates',
      'New Gigafactory construction announced',
      'Concerns over increased competition in EV market',
      'Full Self-Driving updates show improvement',
      'Energy storage division posts strong growth',
      'Production challenges at Berlin facility',
      'Tesla price cuts spark demand concerns',
      'Musk announces new robotaxi plans'
    ],
    'NVDA': [
      'NVIDIA AI chip demand remains insatiable',
      'Data center revenue reaches new heights',
      'Gaming GPU sales show recovery',
      'New AI partnerships announced with tech giants',
      'Supply constraints easing gradually',
      'NVIDIA expands into automotive AI',
      'Record breaking quarterly earnings reported',
      'Competition from AMD intensifies'
    ]
  };

  const analyzeSentiment = async (headlines) => {
    const results = [];
    
    for (const headline of headlines) {
      try {
        // *** FIX 1: Added required API headers for Anthropic ***
        // You MUST replace 'YOUR_ANTHROPIC_API_KEY' with your actual key.
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'YOUR_ANTHROPIC_API_KEY', // <-- IMPORTANT!
            'anthropic-version': '2023-06-01' // Recommended header
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: `Analyze the sentiment of this financial headline and respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{"sentiment": "positive" or "negative" or "neutral", "score": 0.0-1.0, "reasoning": "brief explanation"}

Headline: "${headline}"`
            }]
          })
        });

        if (!response.ok) {
            // Throw an error if the API key is missing or invalid
            const err = await response.json();
            throw new Error(err.error?.message || 'API request failed');
        }

        const data = await response.json();
        const text = data.content[0].text.trim();
        const cleanText = text.replace(/```json\n?|\n?```/g, '');
        const parsed = JSON.parse(cleanText);
        
        results.push({
          headline,
          sentiment: parsed.sentiment,
          score: parsed.score,
          reasoning: parsed.reasoning
        });
      } catch (error) {
        console.error("Sentiment analysis error:", error);
        results.push({
          headline,
          sentiment: 'neutral',
          score: 0.5,
          reasoning: error.message.includes('API key') ? 'Analysis failed: Invalid API Key' : 'Analysis unavailable'
        });
      }
    }
    
    return results;
  };

  const getRecommendation = (sentimentCounts) => {
    const total = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral;
    if (total === 0) return { text: 'INSUFFICIENT DATA', color: '#6B7280', icon: '⚪' };

    const posRatio = sentimentCounts.positive / total;
    const negRatio = sentimentCounts.negative / total;

    if (posRatio > 0.6 && sentimentCounts.positive > sentimentCounts.negative * 2) {
      return { text: 'STRONG BUY', color: '#10B981', icon: '🚀' };
    } else if (posRatio > 0.4 && sentimentCounts.positive > sentimentCounts.negative * 1.5) {
      return { text: 'BUY', color: '#34D399', icon: '📈' };
    } else if (negRatio > 0.6 && sentimentCounts.negative > sentimentCounts.positive * 2) {
      return { text: 'STRONG SELL', color: '#EF4444', icon: '📉' };
    } else if (negRatio > 0.4 && sentimentCounts.negative > sentimentCounts.positive * 1.5) {
      return { text: 'SELL', color: '#F87171', icon: '⚠️' };
    } else {
      return { text: 'HOLD', color: '#F59E0B', icon: '⏸️' };
    }
  };

  const handleAnalyze = async () => {
    const tickerUpper = ticker.toUpperCase().trim();
    if (!tickerUpper) return;

    setAnalyzing(true);
    setCurrentAnalysis(null); // Clear previous analysis

    const headlines = mockNewsData[tickerUpper] || [
      'Company announces quarterly results',
      'Market volatility affects stock performance',
      'Analysts maintain neutral outlook',
      'Industry trends show mixed signals',
      'Regulatory developments impact sector'
    ];

    const results = await analyzeSentiment(headlines);

    const sentimentCounts = {
      positive: results.filter(r => r.sentiment === 'positive').length,
      negative: results.filter(r => r.sentiment === 'negative').length,
      neutral: results.filter(r => r.sentiment === 'neutral').length
    };

    const recommendation = getRecommendation(sentimentCounts);
    const avgScore = results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;

    const analysis = {
      ticker: tickerUpper,
      timestamp: new Date().toISOString(),
      headlines: results,
      sentimentCounts,
      recommendation,
      avgScore,
      totalHeadlines: results.length
    };

    setCurrentAnalysis(analysis);

    // Update historical data
    setHistoricalData(prev => {
      const tickerHistory = prev[tickerUpper] || [];
      const newHistory = [...tickerHistory, {
        date: new Date().toLocaleDateString(),
        positive: sentimentCounts.positive,
        negative: sentimentCounts.negative,
        neutral: sentimentCounts.neutral,
        avgScore: avgScore
      }].slice(-7);
      
      return { ...prev, [tickerUpper]: newHistory };
    });

    setAnalyzing(false);
  };

  const addToWatchlist = () => {
    const tickerUpper = ticker.toUpperCase().trim();
    if (tickerUpper && !watchlist.includes(tickerUpper)) {
      setWatchlist([...watchlist, tickerUpper]);
    }
  };

  const removeFromWatchlist = (t) => {
    setWatchlist(watchlist.filter(item => item !== t));
  };

  const exportData = () => {
    if (!currentAnalysis) return;
    const dataStr = JSON.stringify(currentAnalysis, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentAnalysis.ticker}_analysis_${new Date().toISOString()}.json`;
    link.click();
  };

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = darkMode ? 'text-gray-400' : 'text-gray-600';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';

  const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

  // Data for the bar chart
  const barData = currentAnalysis ? [
    { name: 'Positive', count: currentAnalysis.sentimentCounts.positive, fill: '#10B981' },
    { name: 'Negative', count: currentAnalysis.sentimentCounts.negative, fill: '#EF4444' },
    { name: 'Neutral', count: currentAnalysis.sentimentCounts.neutral, fill: '#F59E0B' }
  ] : [];

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} transition-colors duration-300`}>
      {/* Header */}
      <header className={`${cardBg} border-b ${borderColor} sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold">FinSentiment Pro</h1>
                <p className={`text-sm ${textMuted}`}>AI-Powered Market Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className={`${cardBg} rounded-xl shadow-lg p-6 mb-6 border ${borderColor}`}>
          <div className="flex gap-3">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="Enter stock ticker (e.g., AAPL, GOOGL, MSFT)"
              className={`flex-1 px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border ${borderColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  <span>Analyze</span>
                </>
              )}
            </button>
            <button
              onClick={addToWatchlist}
              className={`px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} hover:bg-gray-600 rounded-lg transition-colors`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Watchlist */}
        <div className={`${cardBg} rounded-xl shadow-lg p-6 mb-6 border ${borderColor}`}>
          <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-500" />
            <span>Watchlist</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {watchlist.map(t => (
              <div key={t} className={`px-4 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg flex items-center space-x-2 group`}>
                <button
                  onClick={() => {
                    setTicker(t);
                    handleAnalyze();
                  }}
                  className="font-semibold hover:text-blue-500 transition-colors"
                >
                  {t}
                </button>
                <button
                  onClick={() => removeFromWatchlist(t)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Analysis */}
        {currentAnalysis && (
          <>
            {/* Recommendation Card */}
            <div className={`${cardBg} rounded-xl shadow-lg p-8 mb-6 border ${borderColor} text-center`}>
              <p className={`text-sm ${textMuted} mb-2`}>Recommendation for {currentAnalysis.ticker}</p>
              <div className="flex items-center justify-center space-x-4 mb-4">
                <span style={{ color: currentAnalysis.recommendation.color }} className="text-6xl">
                  {currentAnalysis.recommendation.icon}
                </span>
                <h2 style={{ color: currentAnalysis.recommendation.color }} className="text-5xl font-bold">
                  {currentAnalysis.recommendation.text}
                </h2>
              </div>
              <p className={`${textMuted} text-sm`}>
                Based on analysis of {currentAnalysis.totalHeadlines} recent headlines
              </p>
              <button
                onClick={exportData}
                className={`mt-4 px-4 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} hover:bg-gray-600 rounded-lg transition-colors inline-flex items-center space-x-2`}
              >
                <Download className="w-4 h-4" />
                <span>Export Analysis</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className={`${cardBg} rounded-xl shadow-lg p-6 border ${borderColor}`}>
                <p className={`text-sm ${textMuted} mb-1`}>Total Headlines</p>
                <p className="text-3xl font-bold">{currentAnalysis.totalHeadlines}</p>
              </div>
              <div className={`${cardBg} rounded-xl shadow-lg p-6 border ${borderColor}`}>
                <p className={`text-sm ${textMuted} mb-1`}>Positive</p>
                <p className="text-3xl font-bold text-green-500">{currentAnalysis.sentimentCounts.positive}</p>
              </div>
              <div className={`${cardBg} rounded-xl shadow-lg p-6 border ${borderColor}`}>
                <p className={`text-sm ${textMuted} mb-1`}>Negative</p>
                <p className="text-3xl font-bold text-red-500">{currentAnalysis.sentimentCounts.negative}</p>
              </div>
              <div className={`${cardBg} rounded-xl shadow-lg p-6 border ${borderColor}`}>
                <p className={`text-sm ${textMuted} mb-1`}>Neutral</p>
                <p className="text-3xl font-bold text-yellow-500">{currentAnalysis.sentimentCounts.neutral}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className={`${cardBg} rounded-xl shadow-lg p-6 border ${borderColor}`}>
                <h3 className="text-lg font-bold mb-4">Sentiment Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Positive', value: currentAnalysis.sentimentCounts.positive },
                        { name: 'Negative', value: currentAnalysis.sentimentCounts.negative },
                        { name: 'Neutral', value: currentAnalysis.sentimentCounts.neutral }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className={`${cardBg} rounded-xl shadow-lg p-6 border ${borderColor}`}>
                <h3 className="text-lg font-bold mb-4">Sentiment Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  {/* *** FIX 2: Correctly colored BarChart *** */}
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                    <XAxis dataKey="name" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', border: '1px solid #374151' }} />
                    <Bar dataKey="count">
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Historical Trend */}
            {historicalData[currentAnalysis.ticker] && historicalData[currentAnalysis.ticker].length > 1 && (
              <div className={`${cardBg} rounded-xl shadow-lg p-6 mb-6 border ${borderColor}`}>
                <h3 className="text-lg font-bold mb-4">7-Day Sentiment Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData[currentAnalysis.ticker]}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                    <XAxis dataKey="date" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', border: '1px solid #374151' }} />
                    <Legend />
                    <Area type="monotone" dataKey="positive" stackId="1" stroke="#10B981" fill="#10B981" />
                    <Area type="monotone" dataKey="neutral" stackId="1" stroke="#F59E0B" fill="#F59E0B" />
                    <Area type="monotone" dataKey="negative" stackId="1" stroke="#EF4444" fill="#EF4444" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Headlines Table */}
            <div className={`${cardBg} rounded-xl shadow-lg p-6 border ${borderColor}`}>
              <h3 className="text-lg font-bold mb-4">Analyzed Headlines</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {currentAnalysis.headlines.map((item, idx) => (
                  <div key={idx} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${borderColor}`}>
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">
                        {item.sentiment === 'positive' ? '🟢' : item.sentiment === 'negative' ? '🔴' : '🟡'}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium mb-1">{item.headline}</p>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className={`${textMuted} capitalize`}>{item.sentiment}</span>
                          <span className={textMuted}>Confidence: {(item.score * 100).toFixed(1)}%</span>
                        </div>
                        <p className={`text-xs ${textMuted} mt-2`}>{item.reasoning}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Welcome Message */}
        {!currentAnalysis && !analyzing && (
          <div className={`${cardBg} rounded-xl shadow-lg p-12 border ${borderColor} text-center`}>
            <Activity className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <h2 className="text-2xl font-bold mb-2">Welcome to FinSentiment Pro</h2>
            <p className={`${textMuted} mb-6`}>
              Enter a stock ticker above and click "Analyze" to get AI-powered sentiment analysis
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left mt-8">
              <div>
                <div className="text-3xl mb-2">🤖</div>
                <h3 className="font-bold mb-1">AI-Powered</h3>
                <p className={`text-sm ${textMuted}`}>Advanced Claude AI analyzes financial sentiment with high accuracy</p>
              </div>
              <div>
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-bold mb-1">Rich Analytics</h3>
                <p className={`text-sm ${textMuted}`}>Interactive charts and historical trend analysis</p>
              </div>
              <div>
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="font-bold mb-1">Real-Time</h3>
                <p className={`text-sm ${textMuted}`}>Get instant buy/sell/hold recommendations</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialSentimentApp;