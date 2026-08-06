import logo from "./logo.webp";
import gmail_logo from "./gmail_logo.svg";
import facebook_logo from "./facebook_logo.svg";
import instagram_logo from "./instagram_logo.svg";
import twitter_logo from "./twitter_logo.svg";
import menu_icon from "./menu_icon.svg";
import search_icon from "./search_icon.svg"
import close_icon from "./close_icon.svg"
import users_icon from "./users_icon.svg"
import car_icon from "./car_icon.svg"
import location_icon from "./location_icon.svg"
import fuel_icon from "./fuel_icon.svg"
import addIcon from "./addIcon.svg"
import carIcon from "./carIcon.svg"
import carIconColored from "./carIconColored.svg"
import dashboardIcon from "./dashboardIcon.svg"
import dashboardIconColored from "./dashboardIconColored.svg"
import addIconColored from "./addIconColored.svg"
import listIcon from "./listIcon.svg"
import listIconColored from "./listIconColored.svg"
import cautionIconColored from "./cautionIconColored.svg"
import arrow_icon from "./arrow_icon.svg"
import star_icon from "./star_icon.svg"
import check_icon from "./check_icon.svg"
import tick_icon from "./tick_icon.svg"
import delete_icon from "./delete_icon.svg"
import eye_icon from "./eye_icon.svg"
import eye_close_icon from "./eye_close_icon.svg"
import filter_icon from "./filter_icon.svg"
import edit_icon from "./edit_icon.svg"
import calendar_icon_colored from "./calendar_icon_colored.svg"
import location_icon_colored from "./location_icon_colored.svg"
import main_car from "./main_car-960.webp"
import main_car_640 from "./main_car-640.webp"
import main_car_1280 from "./main_car-1280.webp"
import main_car_avif from "./main_car.avif"
import banner_car_image from "./banner_car_image.webp"
import upload_icon from "./upload_icon.svg"
import car_image1 from "./car_image1.webp"

export const assets = {
    logo,
    gmail_logo,
    facebook_logo,
    instagram_logo,
    twitter_logo,
    menu_icon,
    search_icon,
    close_icon,
    users_icon,
    edit_icon,
    car_icon,
    location_icon,
    fuel_icon,
    addIcon,
    carIcon,
    carIconColored,
    dashboardIcon,
    dashboardIconColored,
    addIconColored,
    listIcon,
    listIconColored,
    cautionIconColored,
    calendar_icon_colored,
    location_icon_colored,
    arrow_icon,
    star_icon,
    check_icon,
    tick_icon,
    delete_icon,
    eye_icon,
    eye_close_icon,
    filter_icon,
    main_car,
    main_car_640,
    main_car_1280,
    main_car_avif,
    banner_car_image,
    car_image1,
    upload_icon,
}

export const menuLinks = [
    { name: "Home", path: "/" },
    { name: "Cars", path: "/cars" },
]

export const ownerMenuLinks = [
    { nameKey: "admin.menu.dashboard", path: "/owner", icon: dashboardIcon, coloredIcon: dashboardIconColored, permission: "dashboard" },
    { nameKey: "admin.menu.analytics", path: "/owner/analytics", icon: dashboardIcon, coloredIcon: dashboardIconColored, permission: "analytics" },
    { nameKey: "admin.menu.reservations", path: "/owner/manage-bookings", icon: listIcon, coloredIcon: listIconColored, permission: "bookings" },
    { nameKey: "admin.menu.walkIn", path: "/owner/walk-in", icon: addIcon, coloredIcon: addIconColored, permission: "bookings" },
    { nameKey: "admin.menu.calendar", path: "/owner/calendar", icon: calendar_icon_colored, coloredIcon: calendar_icon_colored, permission: "calendar" },
    { nameKey: "admin.menu.customers", path: "/owner/customers", icon: users_icon, coloredIcon: users_icon, permission: "customers" },
    { nameKey: "admin.menu.addCar", path: "/owner/add-car", icon: addIcon, coloredIcon: addIconColored, permission: "fleet" },
    { nameKey: "admin.menu.fleet", path: "/owner/manage-cars", icon: carIcon, coloredIcon: carIconColored, permission: "fleet" },
    { nameKey: "admin.menu.vehicleStats", path: "/owner/vehicle-stats", icon: dashboardIcon, coloredIcon: dashboardIconColored, permission: "fleet" },
    { nameKey: "admin.menu.maintenance", path: "/owner/maintenance", icon: cautionIconColored, coloredIcon: cautionIconColored, permission: "maintenance" },
    { nameKey: "admin.menu.locations", path: "/owner/locations", icon: location_icon, coloredIcon: location_icon_colored, permission: "locations" },
    { nameKey: "admin.menu.reports", path: "/owner/reports", icon: listIcon, coloredIcon: listIconColored, permission: "reports" },
    { nameKey: "admin.menu.contracts", path: "/owner/contracts", icon: listIcon, coloredIcon: listIconColored, permission: "contracts" },
    { nameKey: "admin.menu.invoices", path: "/owner/invoices", icon: listIcon, coloredIcon: listIconColored, permission: "contracts" },
    { nameKey: "admin.menu.templates", path: "/owner/templates", icon: edit_icon, coloredIcon: edit_icon, permission: "templates" },
    { nameKey: "admin.menu.audit", path: "/owner/audit", icon: listIcon, coloredIcon: listIconColored, permission: "audit" },
]
