import { debugLog } from '@/lib/debug';
import { callWithTokenRefresh, handleError } from '@modules/grpc';
import { createChannel, createClient } from 'nice-grpc-web';
import {
  ImageServiceClient,
  ImageServiceDefinition,
  ImageServiceGetImageRequest,
  ImageServiceGetImageResponse,
  ImageServiceGetImageDetailsRequest,
  ImageServiceGetImageDetailsResponse,
  ImageServiceAddImagePropertyRequest,
  ImageServiceAddImagePropertyResponse,
  ImageServiceUpdateImagePropertyRequest,
  ImageServiceUpdateImagePropertyResponse,
  ImageServiceDeleteImagePropertyRequest,
  ImageServiceDeleteImagePropertyResponse,
  ImageServiceCopyImagePropertiesRequest,
  ImageServiceCopyImagePropertiesResponse,
  ImageServiceListImagesRequest,
  ImageServiceListImagesResponse,
} from '../library/blockjoy/v1/image';

class ImageClient {
  private client: ImageServiceClient;

  constructor() {
    const channel = createChannel(process.env.NEXT_PUBLIC_API_URL!);
    this.client = createClient(ImageServiceDefinition, channel);
  }

  async getImage(
    request: ImageServiceGetImageRequest,
  ): Promise<ImageServiceGetImageResponse> {
    debugLog('getImageRequest', request);

    try {
      const response: ImageServiceGetImageResponse = await callWithTokenRefresh(
        this.client.getImage.bind(this.client),
        request,
      );

      debugLog('getImageResponse', response);
      return response;
    } catch (err) {
      return handleError(err);
    }
  }

  async getImageDetails(
    request: ImageServiceGetImageDetailsRequest,
  ): Promise<ImageServiceGetImageDetailsResponse> {
    debugLog('getImageDetailsRequest', request);

    try {
      const response: ImageServiceGetImageDetailsResponse =
        await callWithTokenRefresh(
          this.client.getImageDetails.bind(this.client),
          request,
        );

      debugLog('getImageDetailsResponse', response);
      return response;
    } catch (err) {
      return handleError(err);
    }
  }

  async addImageProperty(
    request: ImageServiceAddImagePropertyRequest,
  ): Promise<ImageServiceAddImagePropertyResponse> {
    debugLog('addImagePropertyRequest', request);

    try {
      const response: ImageServiceAddImagePropertyResponse =
        await callWithTokenRefresh(
          this.client.addImageProperty.bind(this.client),
          request,
        );

      debugLog('addImagePropertyResponse', response);
      return response;
    } catch (err) {
      return handleError(err);
    }
  }

  async updateImageProperty(
    request: ImageServiceUpdateImagePropertyRequest,
  ): Promise<ImageServiceUpdateImagePropertyResponse> {
    debugLog('updateImagePropertyRequest', request);

    try {
      const response: ImageServiceUpdateImagePropertyResponse =
        await callWithTokenRefresh(
          this.client.updateImageProperty.bind(this.client),
          request,
        );

      debugLog('updateImagePropertyResponse', response);
      return response;
    } catch (err) {
      return handleError(err);
    }
  }

  async deleteImageProperty(
    request: ImageServiceDeleteImagePropertyRequest,
  ): Promise<ImageServiceDeleteImagePropertyResponse> {
    debugLog('deleteImagePropertyRequest', request);

    try {
      const response: ImageServiceDeleteImagePropertyResponse =
        await callWithTokenRefresh(
          this.client.deleteImageProperty.bind(this.client),
          request,
        );

      debugLog('deleteImagePropertyResponse', response);
      return response;
    } catch (err) {
      return handleError(err);
    }
  }

  async copyImageProperties(
    request: ImageServiceCopyImagePropertiesRequest,
  ): Promise<ImageServiceCopyImagePropertiesResponse> {
    debugLog('copyImagePropertiesRequest', request);

    try {
      const response: ImageServiceCopyImagePropertiesResponse =
        await callWithTokenRefresh(
          this.client.copyImageProperties.bind(this.client),
          request,
        );

      debugLog('copyImagePropertiesResponse', response);
      return response;
    } catch (err) {
      return handleError(err);
    }
  }

  async listImages(
    request: ImageServiceListImagesRequest,
  ): Promise<ImageServiceListImagesResponse> {
    debugLog('listImagesRequest', request);

    try {
      const response: ImageServiceListImagesResponse =
        await callWithTokenRefresh(
          this.client.listImages.bind(this.client),
          request,
        );

      debugLog('listImagesResponse', response);
      return response;
    } catch (err) {
      return handleError(err);
    }
  }
}

export const imageClient = new ImageClient();
