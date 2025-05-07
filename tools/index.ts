import axios from "axios";

export const getWeather = async (city: string) => {
    const { data } = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}`);

    const essentialData = {
        city: data.name,
        country: data.sys.country,
        weather: {
            main: data.weather[0].main,
            description: data.weather[0].description,
            temp: data.main.temp,
            feels_like: data.main.feels_like,
            humidity: data.main.humidity,
            wind_speed: data.wind.speed
        }
    };

    return essentialData;
}
