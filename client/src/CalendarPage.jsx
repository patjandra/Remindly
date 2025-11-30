import { useState } from 'react';
import BigCalendar from './BigCalendar';

export default function CalendarPage( { user, onLogout } ) {

    const [sideBarOpen, setSideBarOpen] = useState(true);

    {/* If Logout clicked, go to App.jsx + set user to null */}
    function logOut() {
        console.log("🚷Logged out user");
        onLogout();
    }

    return (
        <div className="flex flex-col w-screen h-screen">
            {/* Top Bar */}
            <div className="bg-gray-50 w-full h-15 flex items-center justify-between border-b-2 border-gray-300">
                
                {/* Hamburger + Logo */}
                <div className="flex items-center ">
                    <button onClick={() => setSideBarOpen(!sideBarOpen)}>
                        <img src="/hamburger-icon-blk.svg" alt="Hamburger Icon" className="w-8 h-8 ml-3 cursor-pointer"></img>
                    </button>

                    <img src="/remindly-logo.png" alt="Remindly Logo" className="w-auto h-30 transform hover:-translate-y-1 transition-all duration-300 ease-linear"></img>
                </div>
                {/* Chevrons */}
                <div className="flex items-center mr-3">
                    <button >
                        <img src="/left-chevron-blk.svg" alt="Left Chevron" className="w-10 h-7 cursor-pointer"></img>
                    </button>
                    <button >
                        <img src="/right-chevron-blk.svg" alt="Right Chevron" className="w-10 h-7 cursor-pointer"></img>
                    </button>
                </div>

                {/* Month + Year */}
                <div className="text-black font-semibold text-xl transform hover:-translate-y-1 transition-all duration-300 ease-linear">November 2029</div>

                {/* Log Out */}
                <button onClick={logOut} className="group bg-gray-200 text-black hover:text-red-400 hover:bg-red-200 border-2 border-gray-300 font-semibold ml-170 mr-3 px-2 py-1 rounded-xl cursor-pointer">
                    <div className="flex flex-row items-center justify-center">
                        <img src="/logout-icon-blk.svg" alt="Logout Icon" className="w-auto h-4 mr-1 stroke-current transition-colors"></img>
                        <h1>Log out</h1>
                    </div>   
                </button>
            </div>

            {/* Side Bar + Main Calendar */}
            <div className="flex flex-row grow">
                <div className={`bg-gray-200 border-r-2 border-gray-300 overflow-hidden transition-all duration-300 ${sideBarOpen ? ("w-60 h-auto") : ("w-0 h-0")}}`}>
                    {/* Mini Calendar */}
                    <div className="bg-white w-auto h-50 mt-5 mx-2 mb-10 p-2 rounded-xl border-2 border-gray-300 shadow-md">
                        <h1>Mini Calendar</h1>
                    </div>

                    {/* Assistant Creation Button */}
                    <div className="flex flex-row items-center justify-center text-white font-semibold bg-blue-500 mb-5 mx-2 py-3 rounded-xl hover:bg-blue-400 shadow-md cursor-pointer">
                        <button className="flex flex-row items-center justify-center">
                            <h1 className="mr-5">+</h1>
                            <h1>Create an assistant</h1>
                        </button>
                    </div>

                    {/* Assistant List */}
                    <div className="bg-white w-auto h-auto mb-5 mx-2 p-2 rounded-xl border-2 border-gray-300 shadow-md">
                        <h1>Assistant List</h1>
                    </div>


                </div>

                <div className="bg-white w-auto h-auto grow border-2 border-gray-300 rounded-3xl m-5 p-5">
                    <BigCalendar></BigCalendar>
                </div>
            </div>
        </div>
    );
}