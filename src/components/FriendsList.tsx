import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

interface Friend {
  id: string;
  username: string;
  learning_language: string;
  status: string;
  friend_id?: string;
}

const FriendsList = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: friendships } = await supabase
      .from("friends")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (!friendships) return;

    const friendIds = friendships.map(f => 
      f.user_id === user.id ? f.friend_id : f.user_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, learning_language")
      .in("id", friendIds);

    if (profiles) {
      const friendsWithStatus = profiles.map(profile => {
        const friendship = friendships.find(f => 
          f.user_id === profile.id || f.friend_id === profile.id
        );
        return {
          ...profile,
          status: friendship?.status || "unknown",
          friend_id: friendship?.id
        };
      });
      setFriends(friendsWithStatus);
    }
  };

  const handleAddFriend = async () => {
    if (!searchEmail) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", searchEmail)
      .maybeSingle();

    if (!profiles) {
      toast({
        title: "User not found",
        description: "No user found with that email",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("friends")
      .insert({
        user_id: user.id,
        friend_id: profiles.id,
        status: "pending"
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Friend request sent!",
        description: "Your friend request has been sent.",
      });
      setSearchEmail("");
      fetchFriends();
    }

    setLoading(false);
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friends")
      .update({ status: "accepted" })
      .eq("id", friendshipId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Friend request accepted!",
      });
      fetchFriends();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Partners</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter friend's email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            type="email"
          />
          <Button onClick={handleAddFriend} disabled={loading}>
            Add Friend
          </Button>
        </div>

        <div className="space-y-2">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{friend.username}</p>
                  <p className="text-sm text-muted-foreground">
                    Learning {friend.learning_language}
                  </p>
                </div>
              </div>
              {friend.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => friend.friend_id && handleAcceptRequest(friend.friend_id)}
                >
                  Accept
                </Button>
              )}
              {friend.status === "accepted" && (
                <span className="text-sm text-muted-foreground">Connected</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FriendsList;
