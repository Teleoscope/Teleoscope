"""Unit tests for backend.projection (pure helpers, no Milvus/UMAP)."""
import numpy as np
import pytest

from backend import projection


def test_get_distance_matrix():
    vectors = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
    from sklearn.metrics.pairwise import cosine_distances
    dm = projection.get_distance_matrix(vectors, cosine_distances)
    assert dm.shape == (3, 3)
    assert np.allclose(np.diag(dm), 0.0)


def test_combine_distance_matrices():
    a = np.ones((2, 2)) * 0.5
    b = np.ones((2, 2)) * 0.3
    combined = projection.combine_distance_matrices(a, b)
    assert combined.shape == (4, 4)
    assert np.allclose(combined[:2, :2], a)
    assert np.allclose(combined[2:, 2:], b)
    assert np.allclose(combined[:2, 2:], 1.0)
    assert np.allclose(combined[2:, :2], 1.0)


def test_adjust_intra_cluster_distances():
    dm = np.ones((4, 4))
    groupings = [0, 0, 1, 1]
    projection.adjust_intra_cluster_distances(dm, groupings)
    assert dm[0, 1] < 0.01
    assert dm[1, 0] < 0.01
    assert dm[2, 3] < 0.01
    assert dm[0, 2] == 1.0


def test_organize_clusters():
    cluster_labels = np.array([0, 0, 1, 1, -1])
    source_oids = ["a", "b", "c", "d", "e"]
    doclists = projection.organize_clusters(cluster_labels, source_oids)
    assert len(doclists) == 3
    labels_seen = {dl["label"] for dl in doclists}
    assert "0" in labels_seen and "1" in labels_seen and "-1" in labels_seen
    for dl in doclists:
        assert "ranked_documents" in dl
        assert dl["type"] == "Cluster"
    by_label = {dl["label"]: dl["ranked_documents"] for dl in doclists}
    assert len(by_label["0"]) == 2
    assert len(by_label["1"]) == 2
    assert len(by_label["-1"]) == 1
