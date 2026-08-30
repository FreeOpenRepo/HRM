using NetTopologySuite.Geometries;

namespace hrm_api.Services;

public class GeofenceService
{
    private readonly GeometryFactory _geometryFactory;
    private readonly Polygon _officeGeofencePolygon;

    // Bangkok HQ Center Point: 13.7563, 100.5018
    public double HqLatitude => 13.7563;
    public double HqLongitude => 100.5018;
    public double AllowedRadiusMeters => 250.0;

    public GeofenceService()
    {
        _geometryFactory = new GeometryFactory();

        // Approximate polygon boundary around HQ campus (~300m radius)
        var coordinates = new[]
        {
            new Coordinate(100.4990, 13.7585),
            new Coordinate(100.5045, 13.7585),
            new Coordinate(100.5045, 13.7540),
            new Coordinate(100.4990, 13.7540),
            new Coordinate(100.4990, 13.7585) // Closing ring
        };

        _officeGeofencePolygon = _geometryFactory.CreatePolygon(coordinates);
    }

    public bool IsWithinGeofence(double latitude, double longitude)
    {
        // 1. Point-in-Polygon check via NetTopologySuite
        var userPoint = _geometryFactory.CreatePoint(new Coordinate(longitude, latitude));
        if (_officeGeofencePolygon.Contains(userPoint))
        {
            return true;
        }

        // 2. Haversine distance fallback within AllowedRadiusMeters
        var distance = CalculateDistanceMeters(latitude, longitude, HqLatitude, HqLongitude);
        return distance <= AllowedRadiusMeters;
    }

    public double CalculateDistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double r = 6371000; // Earth radius in meters
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return r * c;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;
}
