import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MapPin, Filter, X } from "lucide-react";

interface LocationFilterProps {
  onFilterChange: (filters: LocationFilters) => void;
  onClose: () => void;
}

export interface LocationFilters {
  maxDistance: number;
  location: string;
  timeSlot: string;
  workoutType: string;
  experienceLevel: string;
  availableNow: boolean;
}

const locations = ["All Locations", "Downtown Gym", "Westside Fitness", "East Coast Gym", "Central Park", "Local Gym"];
const timeSlots = ["All Times", "Early Morning", "Morning", "Afternoon", "Evening", "Late Evening"];
const workoutTypes = ["All Types", "Strength", "Cardio", "Yoga", "Swimming", "Running", "Cycling", "Boxing", "Outdoor"];
const experienceLevels = ["All Levels", "Beginner", "Intermediate", "Advanced"];

export default function LocationFilter({ onFilterChange, onClose }: LocationFilterProps) {
  const [filters, setFilters] = useState<LocationFilters>({
    maxDistance: 5,
    location: "All Locations",
    timeSlot: "All Times",
    workoutType: "All Types",
    experienceLevel: "All Levels",
    availableNow: false,
  });

  const handleFilterUpdate = (key: keyof LocationFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters: LocationFilters = {
      maxDistance: 5,
      location: "All Locations",
      timeSlot: "All Times",
      workoutType: "All Types",
      experienceLevel: "All Levels",
      availableNow: false,
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <Card className="w-full max-w-md rounded-t-3xl rounded-b-none max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Distance Filter */}
          <div>
            <label className="text-sm font-medium text-fitness-dark mb-3 block">
              Maximale Afstand: {filters.maxDistance} km
            </label>
            <Slider
              value={[filters.maxDistance]}
              onValueChange={(value) => handleFilterUpdate('maxDistance', value[0])}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Location Filter */}
          <div>
            <label className="text-sm font-medium text-fitness-dark mb-2 block flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              Locatie
            </label>
            <Select value={filters.location} onValueChange={(value) => handleFilterUpdate('location', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer locatie" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Slot Filter */}
          <div>
            <label className="text-sm font-medium text-fitness-dark mb-2 block">
              Tijdstip
            </label>
            <Select value={filters.timeSlot} onValueChange={(value) => handleFilterUpdate('timeSlot', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer tijdstip" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((timeSlot) => (
                  <SelectItem key={timeSlot} value={timeSlot}>
                    {timeSlot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workout Type Filter */}
          <div>
            <label className="text-sm font-medium text-fitness-dark mb-2 block">
              Workout Type
            </label>
            <Select value={filters.workoutType} onValueChange={(value) => handleFilterUpdate('workoutType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer workout type" />
              </SelectTrigger>
              <SelectContent>
                {workoutTypes.map((workoutType) => (
                  <SelectItem key={workoutType} value={workoutType}>
                    {workoutType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Experience Level Filter */}
          <div>
            <label className="text-sm font-medium text-fitness-dark mb-2 block">
              Ervaring Niveau
            </label>
            <Select value={filters.experienceLevel} onValueChange={(value) => handleFilterUpdate('experienceLevel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer niveau" />
              </SelectTrigger>
              <SelectContent>
                {experienceLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Available Now Filter */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-fitness-dark">
              Alleen nu beschikbaar
            </label>
            <Button
              variant={filters.availableNow ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterUpdate('availableNow', !filters.availableNow)}
              className={filters.availableNow ? "bg-fitness-green hover:bg-green-600" : ""}
            >
              {filters.availableNow ? "Aan" : "Uit"}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button variant="outline" onClick={resetFilters} className="flex-1">
              Reset
            </Button>
            <Button onClick={onClose} className="flex-1 bg-fitness-blue hover:bg-blue-600">
              Toepassen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}