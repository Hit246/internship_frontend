import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Download,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";
import { useEnvironment } from "@/lib/EnvironmentContext";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const { user } = useUser();
  const { theme } = useEnvironment();
  const isLight = theme === "light";

  const [isdialogeopen, setisdialogeopen] = useState(false);
  return (
    <aside
      className={cn(
        "w-64 border-r min-h-screen p-2 transition-colors",
        isLight ? "bg-white text-gray-900 border-gray-200" : "bg-neutral-900 text-white border-neutral-800"
      )}
    >
      <nav className="space-y-1">
        <Link href="/">
          <Button
            variant="ghost"
            className={cn("w-full justify-start", isLight ? "text-gray-900" : "text-white")}
          >
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>
        <Link href="/explore">
          <Button
            variant="ghost"
            className={cn("w-full justify-start", isLight ? "text-gray-900" : "text-white")}
          >
            <Compass className="w-5 h-5 mr-3" />
            Explore
          </Button>
        </Link>
        <Link href="/subscriptions">
          <Button
            variant="ghost"
            className={cn("w-full justify-start", isLight ? "text-gray-900" : "text-white")}
          >
            <PlaySquare className="w-5 h-5 mr-3" />
            Subscriptions
          </Button>
        </Link>

        {user && (
          <>
            <div className="border-t pt-2 mt-2">
              <Link href="/history">
                <Button
                  variant="ghost"
                  className={cn("w-full justify-start", isLight ? "text-gray-900" : "text-white")}
                >
                  <History className="w-5 h-5 mr-3" />
                  History
                </Button>
              </Link>
              <Link href="/liked">
                <Button
                  variant="ghost"
                  className={cn("w-full justify-start", isLight ? "text-gray-900" : "text-white")}
                >
                  <ThumbsUp className="w-5 h-5 mr-3" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/watch-later">
                <Button
                  variant="ghost"
                  className={cn("w-full justify-start", isLight ? "text-gray-900" : "text-white")}
                >
                  <Clock className="w-5 h-5 mr-3" />
                  Watch later
                </Button>
              </Link>
              <Link href="/downloads">
                <Button
                  variant="ghost"
                  className={cn("w-full justify-start", isLight ? "text-gray-900" : "text-white")}
                >
                  <Download className="w-5 h-5 mr-3" />
                  Downloads
                </Button>
              </Link>
              {user?.channelname ? (
                <Link href={`/channel/${user.id}`}>
                  <Button
                    variant="ghost"
                    className={cn("w-full justify-start", isLight ? "text-gray-900" : "text-white")}
                  >
                    <User className="w-5 h-5 mr-3" />
                    Your channel
                  </Button>
                </Link>
              ) : (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setisdialogeopen(true)}
                  >
                    Create Channel
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
  );
};

export default Sidebar;
