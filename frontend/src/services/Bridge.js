import axios from "axios";

const API_URL = "http://https://isekaiquizapi.onrender.com:5000/api";

const quizService = {
  startQuiz: async () => {
    const response = await axios.post(`${API_URL}/start_quiz`);
    return response.data;
  },

  submitAnswer: async (sessionId, choice) => {
    const response = await axios.post(`${API_URL}/answer`, {
      session_id: sessionId,
      choice: choice,
    });
    return response.data;
  },

  restartQuiz: async (sessionId) => {
    const response = await axios.post(`${API_URL}/restart`, {
      session_id: sessionId,
    });
    return response.data;
  },

  // New function to submit ratings
  submitRating: async (sessionId, rating, personalityType) => {
    try {
      console.log("Submitting rating:", { sessionId, rating, personalityType });
      const response = await axios.post(`${API_URL}/submit_rating`, {
        session_id: sessionId,
        rating: rating,
        personality_type: personalityType,
      });
      console.log("Rating submission response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error submitting rating:", error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("Error request:", error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error message:", error.message);
      }

      return { error: "Failed to submit rating" };
    }
  },

  // Get rating statistics
  getRatings: async () => {
    try {
      const response = await axios.get(`${API_URL}/ratings`);
      return response.data;
    } catch (error) {
      console.error("Error fetching ratings:", error);
      return { error: "Failed to fetch ratings" };
    }
  },

  // Debug endpoint to check ratings file status
  debugRatings: async () => {
    try {
      const response = await axios.get(`${API_URL}/debug/ratings`);
      return response.data;
    } catch (error) {
      console.error("Error debugging ratings:", error);
      return { error: "Failed to debug ratings" };
    }
  },
};

export default quizService;
