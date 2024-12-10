FROM nvidia/cuda:11.3.1-cudnn8-devel-ubuntu20.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3-pip \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Clone Semantic-SAM early
WORKDIR /sam_app
RUN git clone https://github.com/UX-Decoder/Semantic-SAM .

# Install PyTorch with CUDA support
RUN pip3 install torch==1.13.1 torchvision==0.14.1 --extra-index-url https://download.pytorch.org/whl/cu113

# Install detectron2-xyz
RUN python3 -m pip install 'git+https://github.com/MaureenZOU/detectron2-xyz.git'

# Install panopticapi
RUN pip3 install git+https://github.com/cocodataset/panopticapi.git

# Install requirements
RUN python3 -m pip install -r requirements.txt

# Install requests
RUN python3 -m pip install requests

# Set environment variable for dataset path
ENV DATASET=/data/coco

# Default command
CMD ["bash"]

