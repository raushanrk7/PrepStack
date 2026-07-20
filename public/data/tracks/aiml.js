// AI/ML track curriculum.
(function () {
  const D = (name, link, type) => (type ? { name, link, type } : { name, link });

  const week1 = {
    title: "ML Foundations",
    days: [
      D("Supervised vs unsupervised learning", "https://www.coursera.org/specializations/machine-learning-introduction"),
      D("Bias-variance tradeoff, overfitting", "https://www.coursera.org/specializations/machine-learning-introduction"),
      D("Linear & logistic regression", "https://www.coursera.org/specializations/machine-learning-introduction"),
      D("Regularization (L1/L2)", "https://www.coursera.org/specializations/machine-learning-introduction"),
      D("Evaluation metrics (precision/recall/ROC-AUC)", "https://scikit-learn.org/stable/modules/model_evaluation.html"),
      D("Practice: build a regression model end-to-end", "https://scikit-learn.org/stable/", "design"),
      D("Practice: build a classification model end-to-end", "https://scikit-learn.org/stable/", "design")
    ]
  };
  const week2 = {
    title: "Deep Learning Fundamentals",
    days: [
      D("Neural network basics, backpropagation", "https://www.deeplearning.ai/"),
      D("CNNs for vision", "https://cs231n.github.io/"),
      D("RNNs/LSTMs for sequences", "https://www.deeplearning.ai/"),
      D("Transformers & attention mechanism", "https://jalammar.github.io/illustrated-transformer/"),
      D("Training tricks: batch norm, dropout, learning rate schedules", "https://www.deeplearning.ai/"),
      D("Practice: train a small CNN", "https://pytorch.org/tutorials/", "design"),
      D("Practice: implement attention from scratch", "https://jalammar.github.io/illustrated-transformer/", "design")
    ]
  };
  const week4 = {
    title: "LLMs & Applied AI Systems",
    days: [
      D("LLM architecture & tokenization", "https://jalammar.github.io/illustrated-transformer/"),
      D("Prompting & in-context learning", "https://www.promptingguide.ai/"),
      D("RAG (retrieval-augmented generation) systems", "https://www.promptingguide.ai/techniques/rag"),
      D("Fine-tuning vs RAG vs prompting tradeoffs", "https://www.promptingguide.ai/"),
      D("Evaluating LLM outputs", "https://www.promptingguide.ai/"),
      D("Practice: build a RAG pipeline", "https://python.langchain.com/docs/tutorials/rag/", "design"),
      D("Practice: build an LLM eval harness", "https://www.promptingguide.ai/", "design")
    ]
  };
  const week5 = {
    title: "ML System Design",
    days: [
      D("ML system design framework", "https://github.com/donnemartin/system-design-primer"),
      D("Feature stores & data pipelines", "https://www.tecton.ai/blog/what-is-a-feature-store/"),
      D("Model serving & versioning", "https://www.tensorflow.org/tfx/guide/serving"),
      D("A/B testing & online evaluation", "https://www.tensorflow.org/tfx"),
      D("Monitoring model drift", "https://www.tensorflow.org/tfx"),
      D("Design: Recommendation system", "https://github.com/donnemartin/system-design-primer", "design"),
      D("Design: Search ranking system", "https://github.com/donnemartin/system-design-primer", "design")
    ]
  };

  window.PrepStackRegister.track("aiml", {
    name: "AI/ML — Machine Learning Systems",
    icon: "🧠",
    blurb: "ML foundations, deep learning, LLM systems, and ML system design for applied AI interviews.",
    durations: {
      4: [week1, week2, week4, week5],
      6: [week1, week2, { ...week2, title: "Deep Learning: Advanced Architectures" }, week4, week5, { ...week5, title: "Mock Review" }],
      8: [week1, week2, { ...week2, title: "Deep Learning: Advanced Architectures" }, { ...week1, title: "Classical ML: Trees & Ensembles" }, week4, { ...week4, title: "LLM Systems: Advanced" }, week5, { ...week5, title: "Mock Review" }]
    }
  });
})();
