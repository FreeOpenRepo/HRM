# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["hrm-api.csproj", "./"]
RUN dotnet restore "hrm-api.csproj"

COPY . .
RUN dotnet publish "hrm-api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5060
EXPOSE 5060
ENTRYPOINT ["dotnet", "hrm-api.dll"]
