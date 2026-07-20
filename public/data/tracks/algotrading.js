// AlgoTrading track curriculum.
(function () {
  const D = (name, link, type) => (type ? { name, link, type } : { name, link });

  const week1 = {
    title: "Market Microstructure Foundations",
    days: [
      D("Order books, bid-ask spread, market vs limit orders", "https://www.investopedia.com/terms/o/order-book.asp"),
      D("Market makers & liquidity", "https://www.investopedia.com/terms/m/marketmaker.asp"),
      D("Order types & execution algorithms (TWAP/VWAP)", "https://www.investopedia.com/terms/v/vwap.asp"),
      D("Latency & co-location basics", "https://www.investopedia.com/terms/h/high-frequency-trading.asp"),
      D("Backtesting fundamentals & pitfalls (lookahead bias)", "https://www.quantstart.com/articles/Successful-Backtesting-of-Algorithmic-Trading-Strategies-Part-I/"),
      D("Practice: build a simple moving-average crossover backtest", "https://www.quantstart.com/", "design"),
      D("Practice: analyze order book data for a liquid symbol", "https://www.investopedia.com/terms/o/order-book.asp", "design")
    ]
  };
  const week2 = {
    title: "Trading System Architecture",
    days: [
      D("Trading system components: data feed, strategy, OMS, risk", "https://www.quantstart.com/articles/"),
      D("Low-latency system design for trading", "https://www.quantstart.com/articles/"),
      D("Risk management: position sizing, stop-loss, drawdown limits", "https://www.investopedia.com/terms/r/risk-management.asp"),
      D("Portfolio construction basics", "https://www.investopedia.com/terms/p/portfolio-management.asp"),
      D("Regulatory & compliance basics for algo trading", "https://www.sec.gov/investor/pubs/algotrading.htm"),
      D("Design: Simple algorithmic trading system architecture", "https://www.quantstart.com/", "design"),
      D("Design: Risk management module for a trading bot", "https://www.investopedia.com/terms/r/risk-management.asp", "design")
    ]
  };

  window.PrepStackRegister.track("algotrading", {
    name: "AlgoTrading",
    icon: "📈",
    blurb: "Market microstructure, trading system architecture, backtesting, and risk management.",
    durations: {
      4: [week1, week2, { ...week1, title: "Strategy Design & Statistical Arbitrage" }, { ...week2, title: "Mock Review" }],
      6: [week1, week2, { ...week1, title: "Strategy Design & Statistical Arbitrage" }, { ...week2, title: "Execution Algorithms Deep Dive" }, { ...week1, title: "Advanced Backtesting" }, { ...week2, title: "Mock Review" }],
      8: [week1, week2, { ...week1, title: "Strategy Design & Statistical Arbitrage" }, { ...week2, title: "Execution Algorithms Deep Dive" }, { ...week1, title: "Advanced Backtesting" }, { ...week2, title: "Portfolio Risk Systems" }, { ...week1, title: "Mixed Practice" }, { ...week2, title: "Mock Review" }]
    }
  });
})();
