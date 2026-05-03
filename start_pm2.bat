@echo off
echo Starting MedTracker with PM2...
pm2 start ecosystem.config.json
pm2 save
echo MedTracker is now running in the background!
echo.
echo To check status: pm2 status
echo To stop: pm2 stop medtracker
echo To restart: pm2 restart medtracker
echo.
pause