"""Unit tests for backend.utils (pure functions, no DB/RabbitMQ)."""
import numpy as np
import pytest

from backend import utils


def test_sanitize_filepath():
    assert utils.sanitize_filepath("normal.txt") == "normal.txt"
    assert utils.sanitize_filepath("file with spaces.txt") == "file_with_spaces.txt"
    assert " " not in utils.sanitize_filepath("a b c")
    assert utils.sanitize_filepath("path/to/file.pdf") == "path/to/file.pdf"
    assert utils.sanitize_filepath("weird@chars#here") == "weird_chars_here"


def test_truncate_string():
    assert utils.truncate_string("short", 10) == "short"
    assert utils.truncate_string("way too long", 8) == "way t..."
    # When len(s) > max_length, result is s[:max_length-3] + '...'
    assert len(utils.truncate_string("exactly7", 7)) == 7
    assert utils.truncate_string("exactly7", 7).endswith("...")


def test_sanitize_db_name():
    assert utils.sanitize_db_name("valid") == "valid"
    assert utils.sanitize_db_name("has space") == "has_space"
    assert utils.sanitize_db_name("a.b/c\\d") == "a_b_c_d"
    with pytest.raises(ValueError, match="cannot be empty"):
        utils.sanitize_db_name("")


def test_binary_search():
    assert utils.binary_search([1, 2, 3, 4, 5], 3) == 2
    assert utils.binary_search([1, 2, 3, 4, 5], 1) == 0
    assert utils.binary_search([1, 2, 3, 4, 5], 6) == -1
    assert utils.binary_search([], 1) == -1


def test_calculate_similarity():
    q = np.array([1.0, 0.0, 0.0])
    docs = np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.5, 0.5, 0.0]])
    scores = utils.calculateSimilarity(docs, q)
    assert len(scores) == 3
    assert scores[0] >= 0.99
    assert scores[1] <= 0.01
    assert 0.4 <= scores[2] <= 0.8


def test_rank_documents_by_similarity_threshold():
    ids = ["a", "b", "c", "d"]
    scores = np.array([0.1, 0.9, 0.5, 0.8])
    out = utils.rankDocumentsBySimilarityThreshold(ids, scores, 0.5)
    assert out == [("b", 0.9), ("d", 0.8), ("c", 0.5)]
    assert utils.rankDocumentsBySimilarityThreshold(ids, scores, 1.0) == []


def test_rank_documents_by_similarity():
    ids = ["a", "b", "c"]
    scores = np.array([0.2, 0.9, 0.5])
    out = utils.rankDocumentsBySimilarity(ids, scores, n_top=2)
    assert len(out) == 2
    assert out[0][0] == "b" and out[0][1] == pytest.approx(0.9)
    assert out[1][0] == "c"


def test_filter_vectors_by_oid():
    oids = ["id1", "id3"]
    ids = ["id1", "id2", "id3"]
    vectors = [[1], [2], [3]]
    out = utils.filter_vectors_by_oid(oids, ids, vectors)
    assert out == [[1], [3]]
    assert utils.filter_vectors_by_oid(["missing"], ids, vectors) == []


def test_rank_document_ids_by_similarity():
    # Use multi-char ids so key=lambda x: x[1] doesn't crash
    doc_ids = ["id1", "id2", "id3"]
    scores = [0.1, 0.9, 0.5]
    out = utils.rank_document_ids_by_similarity(doc_ids, scores)
    assert len(out) == 3
    assert set(out) == set(doc_ids)
