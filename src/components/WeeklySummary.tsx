import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  Collapse,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import {
  makeStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
} from "@material-ui/icons";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useSelector } from "react-redux";
import { RootState } from "store/types";
import Lecture from "types/lecture";
import { format, subWeeks, addWeeks, startOfWeek, endOfWeek } from "date-fns";
import { sv } from "date-fns/locale";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    summaryContainer: {
      background: "linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)",
      borderRadius: "12px",
      padding: theme.spacing(3),
      marginBottom: theme.spacing(3),
      border: "2px solid #404040",
      position: "relative",
      overflow: "hidden",
    },
    header: {
      display: "flex",
      alignItems: "center",
      marginBottom: theme.spacing(2),
    },
    title: {
      color: "white",
      fontWeight: 600,
      marginLeft: theme.spacing(1),
    },
    subtitle: {
      color: "#ccc",
      fontSize: "0.9rem",
      marginBottom: theme.spacing(2),
    },
    summaryText: {
      color: "white",
      fontSize: "1rem",
      lineHeight: 1.6,
      marginBottom: theme.spacing(2),
      fontStyle: "italic",
    },
    userSection: {
      background: "#1a1a1a",
      borderRadius: "8px",
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2),
      border: "1px solid #404040",
    },
    userName: {
      color: "#2196f3",
      fontWeight: 600,
      marginBottom: theme.spacing(1),
    },
    userSummary: {
      color: "#ccc",
      fontSize: "0.9rem",
      lineHeight: 1.5,
    },
    aiIcon: {
      color: "#FFD700",
      fontSize: "1.5rem",
    },
    refreshButton: {
      color: "#ccc",
      marginLeft: "auto",
    },
    expandButton: {
      color: "#ccc",
      padding: theme.spacing(0.5),
    },
    statsChip: {
      background: "#404040",
      color: "#ccc",
      fontSize: "0.8rem",
      margin: theme.spacing(0.5),
    },
    loadingText: {
      color: "#ccc",
      fontStyle: "italic",
    },
  })
);

interface WeeklySummaryProps {
  lectures: Lecture[];
}

const WeeklySummary: React.FC<WeeklySummaryProps> = ({ lectures }) => {
  const classes = useStyles();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [userSummaries, setUserSummaries] = useState<{ [key: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const allUsers = ["Mattias", "Albin", "David"];

  // Generate AI summary based on lecture data
  const generateWeeklySummary = () => {
    setIsGenerating(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      const currentDate = new Date();
      const twoWeeksAgo = subWeeks(currentDate, 2);
      const twoWeeksAhead = addWeeks(currentDate, 2);
      
      // Filter lectures for the 4-week period
      const relevantLectures = lectures.filter(lecture => {
        const lectureDate = new Date(lecture.date);
        return lectureDate >= twoWeeksAgo && lectureDate <= twoWeeksAhead;
      });

      // Calculate statistics for each user
      const userStats: { [key: string]: any } = {};
      
      allUsers.forEach(user => {
        const selectedLectures = relevantLectures.filter(lecture => 
          lecture.checkboxState?.[user]?.confirm
        );
        
        const totalHours = selectedLectures.reduce((sum, lecture) => {
          const [start, end] = lecture.time.split('-');
          const startHour = parseInt(start.split(':')[0]);
          const endHour = parseInt(end.split(':')[0]);
          return sum + (endHour - startHour);
        }, 0);

        const specialties = selectedLectures.map(lecture => {
          const title = lecture.title.toLowerCase();
          if (title.includes('kardi')) return 'Kardiologi';
          if (title.includes('neuro')) return 'Neurologi';
          if (title.includes('gastro')) return 'Gastroenterologi';
          if (title.includes('endo')) return 'Endokrinologi';
          if (title.includes('pulmo')) return 'Pulmonologi';
          if (title.includes('pediatrik') || title.includes('barn')) return 'Pediatrik';
          if (title.includes('gynekologi')) return 'Gynekologi';
          if (title.includes('kirurgi')) return 'Kirurgi';
          return 'Övrigt';
        });

        const mostCommonSpecialty = specialties.reduce((acc, specialty) => {
          acc[specialty] = (acc[specialty] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

        const topSpecialty = Object.entries(mostCommonSpecialty)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Ingen preferens';

        userStats[user] = {
          selectedCount: selectedLectures.length,
          totalHours,
          topSpecialty,
          lectures: selectedLectures
        };
      });

      // Generate humorous and relevant summary for 23-year-olds
      const generateUserSummary = (user: string, stats: any) => {
        const genZTemplates = [
          `${user} curated ${stats.selectedCount} medicinska vibes denna period med focus på ${stats.topSpecialty}. ${stats.selectedCount > 6 ? 'Big productivity main character energy! ✨' : 'Soft life approach - quality over quantity, vi respekterar det 💎'} Type A personality eller bara built different?`,
          
          `OK hear me out: ${user} consumed ${stats.selectedCount} lectures like it's binge-watching Netflix, men make it academic. ${stats.topSpecialty} hit different though - någon har discovered sin passion! ${stats.totalHours > 20 ? 'PhD student vibes already! 🤓' : 'Balanced approach - mental health comes first 🧘‍♀️'}`,
          
          `Plot twist: ${user} is actually the main character med ${stats.selectedCount} strategically chosen study sessions. ${stats.topSpecialty} era incoming? ${stats.selectedCount === 0 ? 'Mystery person - keeping us guessing! 🕵️‍♀️' : 'Character development arc in progress... 📈'}`,
          
          `${user} said "periodt" och picked ${stats.selectedCount} lectures som passar perfect till personality. ${stats.topSpecialty} specialist incoming! ${stats.totalHours > 15 ? 'Overachiever status unlocked 🏆' : 'Chill but effective - we stan sustainable habits! 🌱'}`,
          
          `Breaking: ${user} went viral på study-tok med ${stats.selectedCount} perfectly curated content pieces. ${stats.topSpecialty} influencer era? ${stats.selectedCount > 7 ? 'Algorithm blessed! 📱✨' : 'Niche content creator vibes - authentic och real 💯'}`,
          
          `${user} is giving ${stats.selectedCount}-lecture energy med heavy ${stats.topSpecialty} rotation. ${stats.selectedCount > 5 ? 'Academic weapon status! Nobody doing it like dem 🔥' : 'Minimalist queen - less is more philosophy 👑'}`,
          
          `Spotify Wrapped but make it medical: ${user} top genre är ${stats.topSpecialty} med ${stats.selectedCount} total streams. ${stats.totalHours > 18 ? 'Top 1% listener - obsessed much? (vi älskar det) 🎧' : 'Casual listener med good taste - chef\'s kiss 👌'}`,
          
          `${user} dropped ${stats.selectedCount} study sessions på sin story och vi är here for it! ${stats.topSpecialty} arc är iconic. ${stats.selectedCount >= 6 ? 'Renaissance era - multitalented legend! 🎨' : 'Focused king/queen - när du vet vad du vill 🎯'}`,
          
          `Study aesthetic report: ${user} created ${stats.selectedCount} perfectly curated moments med ${stats.topSpecialty} som signature style. ${stats.totalHours > 12 ? 'Pinterest board goals - absolutely iconic! 📌' : 'Cozy academic vibes - soft och sustainable 🕯️'}`
        ];
        
        return genZTemplates[Math.floor(Math.random() * genZTemplates.length)];
      };

      // Generate individual user summaries
      const newUserSummaries: { [key: string]: string } = {};
      allUsers.forEach(user => {
        newUserSummaries[user] = generateUserSummary(user, userStats[user]);
      });

      // Generate overall summary
      const totalSelected = Object.values(userStats).reduce((sum, stats) => sum + stats.selectedCount, 0);
      const sortedUsers = Object.entries(userStats).sort(([,a], [,b]) => b.selectedCount - a.selectedCount);
      const mostActiveUser = sortedUsers[0][0];
      const leastActiveUser = sortedUsers[sortedUsers.length - 1][0];
      
      // Ensure we don't use the same user twice - pick different users for variety
      const getRandomOtherUser = (excludeUser: string) => {
        const otherUsers = allUsers.filter(user => user !== excludeUser);
        return otherUsers[Math.floor(Math.random() * otherUsers.length)];
      };
      
      const user1 = mostActiveUser;
      const user2 = mostActiveUser === leastActiveUser ? getRandomOtherUser(mostActiveUser) : leastActiveUser;
      const user3 = allUsers.find(user => user !== user1 && user !== user2) || getRandomOtherUser(user1);

      const overallTemplates = [
        `📱 Ankiologernas TikTok-era: ${totalSelected} medicinska "för dig"-sidor har scrollats! Content creator ${user1} går viral medan ${user2} droppar deep cuts som bara intellectuals fattar. ${user3} hovrar på discover page och viber. ${totalSelected > 25 ? 'Algoritmen har godkänt er - ni trending! 🔥' : 'Organic growth era - respekt för kvalitet över kvantitet 💎'}`,
        
        `🎪 Ankiologernas magiska akademi: ${totalSelected} trollformler har lärts ut denna termin! Ärkemage ${user1} samlar mana intensivt medan Besvärjare ${user2} fokuserar på kraftfulla, utvalda spells. ${user3} hovrar på discover page och viber. ${totalSelected > 30 ? 'Harry Potter-nivå uppnådd! 🦉' : 'Top 10 placement - solid clutch!'}`,
        
        `🎮 Medical battle royale: ${totalSelected} loot boxes öppnade denna vecka! ${user1} är den sweaty tryhard som grinder ranked, ${user2} går för tactical gameplay och ${user3} chillar i creative mode. ${totalSelected > 30 ? 'Victory Royale och Dub emote! 🏆' : 'Top 10 placement - solid clutch!'}`,
        
        `☕ Study café chronicles: ${totalSelected} oat milk lattes beställda (aka föreläsningar). Barista ${user1} gör komplext latte art, ${user2} håller sig till classics och ${user3} experimenterar med alternative milk. ${totalSelected > 20 ? 'Michelin guide för cafés - 5 stars! ⭐' : 'Cozy neighbourhood vibe - exakt rätt energy ✨'}`,
        
        `🏋️‍♀️ Brain gains gymnasium: ${totalSelected} mental reps genomförda! PT ${user1} går all-in på progressive overload, ${user2} fokuserar på form och teknik medan ${user3} håller sig till functional training. ${totalSelected > 28 ? 'Beast mode activated - ni är HUGE! 💪' : 'Lean bulk season - sustainable gains incoming!'}`,
        
        `🎧 Spotify wrapped medical edition: ${totalSelected} tracks i er studieplaylist! ${user1} är top 1% listener, ${user2} discovered hidden gems och ${user3} skapade perfect vibes för alla moods. ${totalSelected > 25 ? 'Main character energy! Spotify vill signa er 🎵' : 'Indie darlings med exquisite taste! 🎶'}`,
        
        `🌱 Sustainable study queens: ${totalSelected} eco-friendly kunskaps-meals konsumerades! Zero-waste ${user1} optimerar allt, slow-living ${user2} går för quality över quantity och mindful ${user3} balanserar perfectly. ${totalSelected > 24 ? 'Greta Thunberg approves! Planet saved! 🌍' : 'Small steps, big impact - vi stan! ♻️'}`,
        
        `🔥 Medical meme lords: ${totalSelected} cursed medical knowledge unlocked! Meme-king ${user1} hittar referencias överallt, ${user2} går för niche intellectual humor och ${user3} är wholesome content curator. ${totalSelected > 22 ? 'Viral potential - TikTok famous incoming! 📈' : 'Underground legends - iykyk 🤫'}`,
        
        `💅 That girl medical era: ${totalSelected} productive morning routines med medicin! Aesthetic queen ${user1} har perfect morning routine, ${user2} balanserar hustle med self-care och ${user3} embodar soft life energy. ${totalSelected > 26 ? 'Pinterest board material - absolutely iconic! 📌' : 'Main character development arc - we love to see it! ✨'}`,
        
        `🚗 Study road trip vibes: ${totalSelected} stops på knowledge highway! Driver ${user1} navigerar expertly, co-pilot ${user2} har bästa playlist och ${user3} är snack master och vibe curator. ${totalSelected > 29 ? 'Epic adventure - Instagram story goals! 📸' : 'Perfect weekend getaway energy - core memories skapade! 🛣️'}`,
        
        `🎪 Dark academia fantasy: ${totalSelected} mystiska böcker lästa i ancient library! Scholar ${user1} deep-dives i rabbit holes, ${user2} apprecierar aesthetic knowledge och ${user3} skapar perfect study atmosphere. ${totalSelected > 27 ? 'Hogwarts acceptance letter incoming! 🦉' : 'Secret society vibes - intellectual elite status! 📚'}`
      ];

      const overallSummary = overallTemplates[Math.floor(Math.random() * overallTemplates.length)];

      setSummary(overallSummary);
      setUserSummaries(newUserSummaries);
      setIsGenerating(false);
    }, 2000);
  };

  useEffect(() => {
    generateWeeklySummary();
  }, [lectures]);

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  const handleRefresh = () => {
    generateWeeklySummary();
  };

  return (
    <Paper className={classes.summaryContainer}>
      <Box className={classes.header}>
        <AutoAwesomeIcon className={classes.aiIcon} />
        <Typography className={classes.title}>
          AI Veckosammanfattning
        </Typography>
        <Tooltip title="Generera ny sammanfattning">
          <IconButton
            size="small"
            onClick={handleRefresh}
            disabled={isGenerating}
            className={classes.refreshButton}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Typography className={classes.subtitle}>
        Humoristisk analys av de senaste och kommande veckornas föreläsningsval
      </Typography>

      {isGenerating ? (
        <Typography className={classes.loadingText}>
          {(() => {
            const loadingMessages = [
              "AI:n funderar på en rolig sammanfattning...",
              "Konsulterar det medicinska oraklet...",
              "Blandar humor med vetenskap i mixern...",
              "Laddar absurditetsmodulen... 🤖",
              "Analyserar era medicinska äventyr...",
              "Kokar ihop en perfekt komedi-cocktail...",
              "Chattar med Dr. Robot om era val...",
              "Kalibrerar humor-algoritmen...",
              "Skannar för medicinska memes...",
              "Komponerar en symfoni av studiestatistik..."
            ];
            return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
          })()}
        </Typography>
      ) : (
        <>
          <Typography className={classes.summaryText}>
            {summary}
          </Typography>

          <Box display="flex" alignItems="center" marginTop={2}>
            <Chip
              label={`${allUsers.length} användare analyserade`}
              className={classes.statsChip}
              size="small"
            />
            <IconButton
              className={classes.expandButton}
              onClick={handleExpand}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expanded}>
            <Box marginTop={2}>
              {allUsers.map((user) => (
                <div key={user} className={classes.userSection}>
                  <Typography className={classes.userName}>
                    {user}
                  </Typography>
                  <Typography className={classes.userSummary}>
                    {userSummaries[user]}
                  </Typography>
                </div>
              ))}
            </Box>
          </Collapse>
        </>
      )}
    </Paper>
  );
};

export default WeeklySummary; 