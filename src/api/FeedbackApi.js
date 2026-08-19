import { genericApi } from "./axiosInstance";

export const submitFeedback = async ({ rating, description }) => {
    const response = await genericApi.post("/api/generic/submitFeedback", {
        rating,
        description,
    });
    return response.data;
};
