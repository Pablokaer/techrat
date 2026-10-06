# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
# Restore first for better layer caching.
COPY Directory.Build.props TechRat.slnx ./
COPY TechRat.Domain/TechRat.Domain.csproj TechRat.Domain/
COPY TechRat.Application/TechRat.Application.csproj TechRat.Application/
COPY TechRat.Infrastructure/TechRat.Infrastructure.csproj TechRat.Infrastructure/
COPY TechRat.Modules/TechRat.Modules.csproj TechRat.Modules/
COPY TechRat.Api/TechRat.Api.csproj TechRat.Api/
# Optional extra CA (corporate TLS-inspecting proxies): docker build --secret id=extra_ca,src=/path/ca.crt
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then cp /run/secrets/extra_ca /usr/local/share/ca-certificates/extra-ca.crt && update-ca-certificates; fi
RUN dotnet restore TechRat.Api/TechRat.Api.csproj
COPY . .
RUN dotnet publish TechRat.Api/TechRat.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true
COPY --from=build /app .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "TechRat.Api.dll"]
