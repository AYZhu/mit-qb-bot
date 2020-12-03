# mit-qb-bot

MIT's quizbowl bot, a companion to and based heavily on https://github.com/kgurazad/tournament-bot, but with edited commands to satisfy our needs

since this is MIT internal, it currently does not have a help message, however, important commands this bot handles:
* *c <n> "room name 1" "room name 2" creates n (n is not optional) text rooms with room names and an associated voice channel
* *a @role #channel-1 #channel-2 adds the given role to those channels
* *r @role1 @role2 gives everyone with role1 role2 additionally, without deleting or creating roles or removing role1
* *m <prefix>[a-b] creates roles of the form "<prefix>x" where x spans the range of ascii characters from character a to character b (e.g. "*m P[A-B]" creates two teams, 'PA', 'PB; notably, this prevents creation of two-digit numbers, in that case use TournamentBot's .m)