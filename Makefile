SHELL := /bin/bash

PROJECT ?= $(shell gcloud config get-value project 2>/dev/null)
REGION ?= $(shell gcloud config get-value run/region 2>/dev/null)
SERVICE ?= hackathon-platform-frontend
PORT ?= 3000
NPM_INSTALL_FLAGS ?= --legacy-peer-deps
BUILD_ENV_VARS ?= NPM_CONFIG_LEGACY_PEER_DEPS=true
AR_REPO ?= cloud-run
IMAGE_NAME ?= $(SERVICE)
TAG ?= latest
LOCAL_IMAGE ?= $(IMAGE_NAME):local
IMAGE ?= $(REGION)-docker.pkg.dev/$(PROJECT)/$(AR_REPO)/$(IMAGE_NAME):$(TAG)
PUBLIC_ACCESS_FLAG ?= --no-invoker-iam-check
INGRESS ?= all
SOURCE_BASE_IMAGE_FLAG ?= --clear-base-image

.PHONY: help install dev build start local local-prod check-gcloud check-docker ensure-ar-repo deploy deploy-source deploy-image deploy-docker describe logs docker-build docker-run docker-push

help:
	@echo "Targets disponibles:"
	@echo "  make install                 Instala dependencias con npm ci"
	@echo "  make local [PORT=3000]       Corre en desarrollo (next dev)"
	@echo "  make local-prod [PORT=3000]  Build + start (modo produccion local)"
	@echo "  make docker-build            Construye imagen Docker local"
	@echo "  make docker-run [PORT=3000]  Corre contenedor local en puerto indicado"
	@echo "  make deploy-source           Despliega en Cloud Run desde codigo fuente"
	@echo "  make deploy-docker           Build+push imagen Docker y despliegue en Cloud Run"
	@echo "  make deploy                  Alias de deploy-docker"
	@echo "  make describe                Muestra URL del servicio desplegado"
	@echo "  make logs                    Lee logs recientes en Cloud Run"
	@echo ""
	@echo "Variables configurables:"
	@echo "  SERVICE=$(SERVICE)"
	@echo "  PROJECT=$(PROJECT)"
	@echo "  REGION=$(REGION)"
	@echo "  PORT=$(PORT)"
	@echo "  NPM_INSTALL_FLAGS=$(NPM_INSTALL_FLAGS)"
	@echo "  BUILD_ENV_VARS=$(BUILD_ENV_VARS)"
	@echo "  AR_REPO=$(AR_REPO)"
	@echo "  IMAGE_NAME=$(IMAGE_NAME)"
	@echo "  TAG=$(TAG)"
	@echo "  IMAGE=$(IMAGE)"
	@echo "  PUBLIC_ACCESS_FLAG=$(PUBLIC_ACCESS_FLAG)"
	@echo "  INGRESS=$(INGRESS)"
	@echo "  SOURCE_BASE_IMAGE_FLAG=$(SOURCE_BASE_IMAGE_FLAG)"

install:
	npm ci $(NPM_INSTALL_FLAGS)

dev:
	npm run dev

build:
	npm run build

start:
	PORT=$(PORT) HOSTNAME=0.0.0.0 npm run start

local: install
	npm run dev -- --hostname 0.0.0.0 --port $(PORT)

local-prod: install build start

check-gcloud:
	@command -v gcloud >/dev/null || (echo "gcloud no esta instalado"; exit 1)
	@test -n "$(PROJECT)" || (echo "Falta PROJECT. Ejecuta: gcloud config set project <PROJECT_ID>"; exit 1)
	@test -n "$(REGION)" || (echo "Falta REGION. Ejecuta: gcloud config set run/region <REGION>"; exit 1)

check-docker:
	@command -v docker >/dev/null || (echo "docker no esta instalado"; exit 1)

ensure-ar-repo: check-gcloud
	@gcloud artifacts repositories describe $(AR_REPO) \
		--project $(PROJECT) \
		--location $(REGION) >/dev/null 2>&1 || \
	gcloud artifacts repositories create $(AR_REPO) \
		--project $(PROJECT) \
		--location $(REGION) \
		--repository-format docker \
		--description "Docker images para Cloud Run"

docker-build: check-docker
	docker build -t $(LOCAL_IMAGE) .

docker-run: docker-build
	docker run --rm -p $(PORT):8080 $(LOCAL_IMAGE)

docker-push: check-docker ensure-ar-repo
	gcloud auth configure-docker $(REGION)-docker.pkg.dev --quiet
	docker build -t $(IMAGE) .
	docker push $(IMAGE)

deploy-source: check-gcloud
	gcloud run deploy $(SERVICE) \
		--source . \
		--project $(PROJECT) \
		--region $(REGION) \
		--platform managed \
		--set-build-env-vars $(BUILD_ENV_VARS) \
		--ingress $(INGRESS) \
		$(SOURCE_BASE_IMAGE_FLAG) \
		$(PUBLIC_ACCESS_FLAG)

deploy-image: check-gcloud
	gcloud run deploy $(SERVICE) \
		--image $(IMAGE) \
		--project $(PROJECT) \
		--region $(REGION) \
		--platform managed \
		--port 8080 \
		--ingress $(INGRESS) \
		$(PUBLIC_ACCESS_FLAG)

deploy-docker: docker-push deploy-image

deploy: deploy-docker

describe: check-gcloud
	@gcloud run services describe $(SERVICE) \
		--project $(PROJECT) \
		--region $(REGION) \
		--format='value(status.url)'

logs: check-gcloud
	gcloud run services logs read $(SERVICE) \
		--project $(PROJECT) \
		--region $(REGION) \
		--limit=100
